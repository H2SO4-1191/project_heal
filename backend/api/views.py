from rest_framework import generics, status, permissions as drf_permissions
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken
from django.utils import timezone
from django.db.models import Q
from datetime import timedelta
import random
from .models import *
from .serializers import *
from .permissions import *


# ==================== Authentication Views ====================

class PatientSignupView(generics.CreateAPIView):
    """Register a new patient user."""
    serializer_class = PatientSignupSerializer
    permission_classes = []


class OTPRequestView(APIView):
    """Request OTP for login."""
    permission_classes = []
    
    def post(self, request):
        serializer = OTPRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        email = serializer.validated_data['email'] # type: ignore
        
        try:
            user = User.objects.get(email=email)
        except User.DoesNotExist:
            return Response(
                {'error': 'User with this email does not exist.'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Generate 6-digit OTP
        otp_code = str(random.randint(100000, 999999))
        user.otp_code = otp_code
        user.otp_generated_at = timezone.now()
        user.save()
        
        # Display OTP in console (for localhost development)
        print(f"OTP for {email}: {otp_code}")
        
        return Response({
            'message': 'OTP sent successfully. Check console.',
            'email': email
        })


class OTPVerifyView(APIView):
    """Verify OTP and get JWT token."""
    permission_classes = []
    
    def post(self, request):
        serializer = OTPVerifySerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        email = serializer.validated_data['email'] # type: ignore
        otp_code = serializer.validated_data['otp_code'] # type: ignore
        
        try:
            user = User.objects.get(email=email)
        except User.DoesNotExist:
            return Response(
                {'error': 'Invalid credentials.'},
                status=status.HTTP_401_UNAUTHORIZED
            )
        
        # Check if OTP is valid
        if not user.is_otp_valid or user.otp_code != otp_code:
            return Response(
                {'error': 'Invalid or expired OTP.'},
                status=status.HTTP_401_UNAUTHORIZED
            )
        
        # Clear OTP after successful verification
        user.otp_code = None
        user.otp_generated_at = None
        user.save()
        
        # Generate JWT token
        refresh = RefreshToken.for_user(user)
        
        return Response({
            'message': 'Login successful.',
            'access': str(refresh.access_token),
            'refresh': str(refresh),
            'user': {
                'email': user.email,
                'user_type': user.user_type,
                'full_name': user.full_name
            }
        })


# ==================== Patient Views ====================

class DoctorListView(generics.ListAPIView):
    """List all doctors with optional filtering by name or specialty."""
    serializer_class = DoctorListSerializer
    permission_classes = []
    
    def get_queryset(self): # type: ignore
        queryset = User.objects.filter(user_type='doctor')
        
        # Filter by name
        name = self.request.query_params.get('name', None) # type: ignore
        if name:
            queryset = queryset.filter(full_name__icontains=name)
        
        # Filter by specialty
        specialty = self.request.query_params.get('specialty', None) # type: ignore
        if specialty:
            queryset = queryset.filter(specialty__icontains=specialty)
        
        return queryset


class DoctorDetailView(generics.RetrieveAPIView):
    """Get detailed profile of a specific doctor."""
    queryset = User.objects.filter(user_type='doctor')
    serializer_class = DoctorDetailSerializer
    permission_classes = []


class DoctorNextAvailableView(APIView):
    """Get the next available appointment slot for a doctor."""
    permission_classes = []
    
    def get(self, request, pk):
        try:
            doctor = User.objects.get(pk=pk, user_type='doctor')
        except User.DoesNotExist:
            return Response(
                {'error': 'Doctor not found.'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Get doctor's availability
        availabilities = DoctorAvailability.objects.filter(doctor=doctor)
        
        if not availabilities.exists():
            return Response({'next_available': None})
        
        # Start checking from now
        current_datetime = timezone.now()
        days_to_check = 30  # Check next 30 days
        
        # Day order: Saturday to Friday (Middle Eastern style)
        day_order = ['saturday', 'sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday']
        
        for day_offset in range(days_to_check):
            check_date = current_datetime.date() + timedelta(days=day_offset)
            day_name = check_date.strftime('%A').lower()
            
            # Check if doctor works on this day
            day_availability = availabilities.filter(day=day_name).first()
            
            if not day_availability:
                continue
            
            # Get all appointments on this day
            day_appointments = Appointment.objects.filter(
                doctor=doctor,
                datetime__date=check_date,
                status__in=['waiting', 'completed']
            ).order_by('datetime')
            
            # Create naive datetime objects for the day's working hours
            start_datetime = timezone.datetime.combine(check_date, day_availability.start_time)
            end_datetime = timezone.datetime.combine(check_date, day_availability.end_time)
            
            # If checking today, start from current time
            if day_offset == 0:
                current_naive = timezone.datetime.now()
                start_datetime = max(start_datetime, current_naive)
            
            # Round up to next 30-minute interval
            minutes = start_datetime.minute
            if minutes % 30 != 0:
                start_datetime = start_datetime.replace(
                    minute=((minutes // 30) + 1) * 30 % 60,
                    second=0,
                    microsecond=0
                )
                if minutes >= 30:
                    start_datetime += timedelta(hours=1)
            
            # Check time slots in 30-minute intervals
            current_slot = start_datetime
            
            while current_slot < end_datetime:
                # Check if this slot conflicts with any appointment
                is_available = True
                
                for appointment in day_appointments:
                    # Convert appointment datetime to naive for comparison
                    appointment_naive = appointment.datetime.replace(tzinfo=None) if appointment.datetime.tzinfo else appointment.datetime
                    
                    # Check if slot is within 30 minutes of existing appointment
                    time_diff = abs((current_slot - appointment_naive).total_seconds() / 60)
                    
                    if time_diff < 30:
                        is_available = False
                        break
                
                if is_available:
                    # Return as ISO format without timezone
                    return Response({
                        'next_available': current_slot.isoformat()
                    })
                
                # Move to next 30-minute slot
                current_slot += timedelta(minutes=30)
        
        # No available slot found in the next 30 days
        return Response({'next_available': None})


class AppointmentCreateView(generics.CreateAPIView):
    """Book a new appointment."""
    serializer_class = AppointmentCreateSerializer
    permission_classes = [IsPatient]


class PatientAppointmentListView(generics.ListAPIView):
    """List patient's own appointments."""
    serializer_class = AppointmentListSerializer
    permission_classes = [IsPatient]
    
    def get_queryset(self): # type: ignore
        return Appointment.objects.filter(patient=self.request.user)


class AppointmentDetailView(generics.RetrieveAPIView):
    """Get details of a specific appointment."""
    queryset = Appointment.objects.all()
    serializer_class = AppointmentDetailSerializer
    permission_classes = [OwnsAppointment]


class AppointmentCancelView(APIView):
    """Cancel an appointment."""
    permission_classes = [IsPatient, OwnsAppointment]
    
    def put(self, request, pk):
        try:
            appointment = Appointment.objects.get(pk=pk)
        except Appointment.DoesNotExist:
            return Response(
                {'error': 'Appointment not found.'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Check object permission
        self.check_object_permissions(request, appointment)
        
        # Check if appointment can be cancelled
        if appointment.status == 'cancelled':
            return Response(
                {'error': 'Appointment is already cancelled.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        if appointment.status == 'completed':
            return Response(
                {'error': 'Cannot cancel a completed appointment.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        appointment.status = 'cancelled'
        appointment.save()
        
        return Response({
            'message': 'Appointment cancelled successfully.',
            'appointment': AppointmentListSerializer(appointment).data
        })


# ==================== Doctor Views ====================

class DoctorTodayAppointmentsView(generics.ListAPIView):
    """List today's appointments for the logged-in doctor."""
    serializer_class = AppointmentListSerializer
    permission_classes = [IsDoctor]
    
    def get_queryset(self): # type: ignore
        today = timezone.now().date()
        return Appointment.objects.filter(
            doctor=self.request.user,
            datetime__date=today,
            status='waiting'
        ).order_by('datetime')


class DoctorAppointmentDetailView(generics.RetrieveAPIView):
    """View details of a specific appointment (for doctors)."""
    serializer_class = DoctorAppointmentDetailSerializer
    permission_classes = [IsDoctor, OwnsAppointment]
    
    def get_queryset(self): # type: ignore
        return Appointment.objects.filter(doctor=self.request.user)


class AppointmentConcludeView(APIView):
    """Conclude an appointment (add diagnosis, medication, etc.)."""
    permission_classes = [IsDoctor, OwnsAppointment]
    
    def put(self, request, pk):
        try:
            appointment = Appointment.objects.get(pk=pk)
        except Appointment.DoesNotExist:
            return Response(
                {'error': 'Appointment not found.'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Check object permission
        self.check_object_permissions(request, appointment)
        
        # Check if appointment can be concluded
        if appointment.status == 'cancelled':
            return Response(
                {'error': 'Cannot conclude a cancelled appointment.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Get chronic diseases update if provided
        chronic_diseases = request.data.get('chronic_diseases', None)
        
        serializer = AppointmentConcludeSerializer(
            appointment,
            data=request.data,
            partial=True,
            context={'chronic_diseases': chronic_diseases}
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()
        
        return Response({
            'message': 'Appointment concluded successfully.',
            'appointment': DoctorAppointmentDetailSerializer(appointment).data
        })


# ==================== Admin Views ====================

class AdminDoctorListView(generics.ListAPIView):
    """List all doctors (admin)."""
    queryset = User.objects.filter(user_type='doctor')
    serializer_class = DoctorDetailSerializer
    permission_classes = [IsAdmin]


class AdminDoctorCreateView(generics.CreateAPIView):
    """Add/register a new doctor (admin)."""
    serializer_class = DoctorCreateSerializer
    permission_classes = [IsAdmin]


class AdminDoctorDeleteView(generics.DestroyAPIView):
    """Delete a doctor (admin)."""
    queryset = User.objects.filter(user_type='doctor')
    permission_classes = [IsAdmin]


class AdminPatientListView(generics.ListAPIView):
    """List all patients (admin)."""
    queryset = User.objects.filter(user_type='patient')
    serializer_class = PatientSerializer
    permission_classes = [IsAdmin]


class AdminPatientDeleteView(generics.DestroyAPIView):
    """Delete a patient (admin)."""
    queryset = User.objects.filter(user_type='patient')
    permission_classes = [IsAdmin]


class AdminAppointmentListView(generics.ListAPIView):
    """List all appointments (admin) - past, today, future."""
    serializer_class = AppointmentListSerializer
    permission_classes = [IsAdmin]
    
    def get_queryset(self): # type: ignore
        queryset = Appointment.objects.all()
        
        # Filter by status
        appointment_status = self.request.query_params.get('status', None) # type: ignore
        if appointment_status:
            queryset = queryset.filter(status=appointment_status)
        
        # Filter by time period
        period = self.request.query_params.get('period', None) # type: ignore
        if period == 'today':
            today = timezone.now().date()
            queryset = queryset.filter(datetime__date=today)
        elif period == 'future':
            queryset = queryset.filter(datetime__gt=timezone.now())
        elif period == 'past':
            queryset = queryset.filter(datetime__lt=timezone.now())
        
        return queryset


class AdminAppointmentDeleteView(generics.DestroyAPIView):
    """Delete an appointment (admin)."""
    queryset = Appointment.objects.all()
    permission_classes = [IsAdmin]


class AdminSwapView(APIView):
    """Change admin account email (with OTP verification)."""
    permission_classes = [IsAdmin]
    
    def post(self, request):
        # Step 1: Request OTPs for both emails
        if 'step' not in request.data or request.data['step'] == 'request':
            new_email = request.data.get('new_email')
            
            if not new_email:
                return Response(
                    {'error': 'New email is required.'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Check if new email already exists
            if User.objects.filter(email=new_email).exists():
                return Response(
                    {'error': 'Email already exists.'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Generate OTP for current admin
            current_otp = str(random.randint(100000, 999999))
            request.user.otp_code = current_otp
            request.user.otp_generated_at = timezone.now()
            request.user.save()
            
            # Create temporary OTP for new email (store in session or similar)
            new_otp = str(random.randint(100000, 999999))
            
            # Display OTPs in console
            print(f"Current Admin OTP ({request.user.email}): {current_otp}")
            print(f"New Admin OTP ({new_email}): {new_otp}")
            
            return Response({
                'message': 'OTPs generated. Check console.',
                'new_email': new_email,
                'new_otp_for_verification': new_otp  # In real app, this would be sent via email
            })
        
        # Step 2: Verify OTPs and swap
        elif request.data['step'] == 'verify':
            serializer = AdminSwapSerializer(data=request.data)
            serializer.is_valid(raise_exception=True)
            
            new_email = serializer.validated_data['new_email'] # type: ignore
            current_otp = serializer.validated_data['current_otp'] # type: ignore
            new_otp = serializer.validated_data['new_otp'] # type: ignore
            
            # Verify current admin OTP
            if not request.user.is_otp_valid or request.user.otp_code != current_otp:
                return Response(
                    {'error': 'Invalid or expired current admin OTP.'},
                    status=status.HTTP_401_UNAUTHORIZED
                )
            
            # In a real implementation, verify new_otp against stored value
            # For now, we'll accept it as is
            
            # Update email
            request.user.email = new_email
            request.user.otp_code = None
            request.user.otp_generated_at = None
            request.user.save()
            
            return Response({
                'message': 'Admin email updated successfully.',
                'new_email': new_email
            })
