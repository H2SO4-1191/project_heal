from rest_framework import serializers
from django.utils import timezone
from datetime import timedelta
from .models import User, Appointment, DoctorAvailability


class PatientSignupSerializer(serializers.ModelSerializer):
    """Serializer for patient registration."""
    
    class Meta:
        model = User
        fields = [
            'email', 'full_name', 'phone_number', 
            'birth_date', 'gender', 'chronic_diseases'
        ]
        extra_kwargs = {
            'chronic_diseases': {'required': False}
        }
    
    def create(self, validated_data):
        validated_data['user_type'] = 'patient'
        user = User.objects.create(**validated_data)
        return user


class OTPRequestSerializer(serializers.Serializer):
    """Serializer for requesting OTP."""
    email = serializers.EmailField()


class OTPVerifySerializer(serializers.Serializer):
    """Serializer for verifying OTP and getting JWT token."""
    email = serializers.EmailField()
    otp_code = serializers.CharField(max_length=6)


class DoctorListSerializer(serializers.ModelSerializer):
    """Serializer for listing doctors (card view)."""
    
    class Meta:
        model = User
        fields = ['id', 'full_name', 'specialty', 'image']


class DoctorAvailabilitySerializer(serializers.ModelSerializer):
    """Serializer for doctor availability."""
    
    class Meta:
        model = DoctorAvailability
        fields = ['id', 'day', 'start_time', 'end_time']


class DoctorDetailSerializer(serializers.ModelSerializer):
    """Serializer for detailed doctor profile."""
    availabilities = DoctorAvailabilitySerializer(many=True, read_only=True)
    
    class Meta:
        model = User
        fields = [
            'id', 'full_name', 'email', 'phone_number', 
            'specialty', 'about', 'image', 'availabilities'
        ]


class PatientSerializer(serializers.ModelSerializer):
    """Serializer for patient details."""
    age = serializers.ReadOnlyField()
    
    class Meta:
        model = User
        fields = [
            'id', 'full_name', 'email', 'phone_number',
            'birth_date', 'age', 'gender', 'chronic_diseases'
        ]


class AppointmentCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating appointments."""
    
    class Meta:
        model = Appointment
        fields = ['doctor', 'datetime']
    
    def validate(self, data):
        doctor = data.get('doctor')
        appointment_datetime = data.get('datetime')
        
        # Check if doctor exists and is a doctor
        if doctor.user_type != 'doctor':
            raise serializers.ValidationError("Selected user is not a doctor.")
        
        # Check if appointment time is in the future
        if appointment_datetime <= timezone.now():
            raise serializers.ValidationError("Appointment time must be in the future.")
        
        # Check if doctor works on this day
        day_name = appointment_datetime.strftime('%A').lower()
        appointment_time = appointment_datetime.time()
        
        day_availability = DoctorAvailability.objects.filter(
            doctor=doctor,
            day=day_name
        ).first()
        
        if not day_availability:
            raise serializers.ValidationError(
                f"Doctor does not work on {day_name.capitalize()}s."
            )
        
        # Check if appointment is within doctor's working hours
        if not (day_availability.start_time <= appointment_time <= day_availability.end_time):
            raise serializers.ValidationError(
                f"Doctor's working hours on {day_name.capitalize()} are {day_availability.start_time.strftime('%H:%M')} - {day_availability.end_time.strftime('%H:%M')}."
            )
        
        # Check if there's a conflicting appointment (within 30 minutes)
        conflicting_appointments = Appointment.objects.filter(
            doctor=doctor,
            status__in=['waiting', 'completed'],
            datetime__gte=appointment_datetime - timedelta(minutes=30),
            datetime__lte=appointment_datetime + timedelta(minutes=30)
        ).exclude(status='cancelled')
        
        if conflicting_appointments.exists():
            raise serializers.ValidationError(
                "The doctor already has an appointment with another patient at this time."
            )
        
        return data
    
    def create(self, validated_data):
        # Get patient from context (request.user)
        patient = self.context['request'].user
        validated_data['patient'] = patient
        return super().create(validated_data)


class AppointmentListSerializer(serializers.ModelSerializer):
    """Serializer for listing appointments."""
    doctor_name = serializers.CharField(source='doctor.full_name', read_only=True)
    patient_name = serializers.CharField(source='patient.full_name', read_only=True)
    doctor_specialty = serializers.CharField(source='doctor.specialty', read_only=True)
    
    class Meta:
        model = Appointment
        fields = [
            'id', 'doctor', 'doctor_name', 'doctor_specialty',
            'patient', 'patient_name', 'datetime', 'status',
            'created_at'
        ]


class AppointmentDetailSerializer(serializers.ModelSerializer):
    """Serializer for detailed appointment view."""
    doctor = DoctorListSerializer(read_only=True)
    patient = PatientSerializer(read_only=True)
    
    class Meta:
        model = Appointment
        fields = [
            'id', 'doctor', 'patient', 'datetime', 'status',
            'conclusion', 'medication', 'created_at', 'updated_at'
        ]


class DoctorAppointmentDetailSerializer(serializers.ModelSerializer):
    """Serializer for doctor viewing appointment details with patient info."""
    patient = PatientSerializer(read_only=True)
    previous_appointments = serializers.SerializerMethodField()
    
    class Meta:
        model = Appointment
        fields = [
            'id', 'patient', 'datetime', 'status',
            'conclusion', 'medication', 'previous_appointments'
        ]
    
    def get_previous_appointments(self, obj):
        """Get previous appointments for this patient with this doctor."""
        previous = Appointment.objects.filter(
            patient=obj.patient,
            doctor=obj.doctor,
            status='completed',
            datetime__lt=obj.datetime
        ).order_by('-datetime')
        
        return [{
            'id': appt.id,
            'datetime': appt.datetime,
            'conclusion': appt.conclusion,
            'medication': appt.medication
        } for appt in previous]


class AppointmentConcludeSerializer(serializers.ModelSerializer):
    """Serializer for doctor concluding an appointment."""
    
    class Meta:
        model = Appointment
        fields = ['conclusion', 'medication']
    
    def update(self, instance, validated_data):
        # Also update the patient's chronic diseases if needed
        chronic_diseases = self.context.get('chronic_diseases')
        if chronic_diseases is not None:
            instance.patient.chronic_diseases = chronic_diseases
            instance.patient.save()
        
        # Update status to completed
        instance.status = 'completed'
        instance.conclusion = validated_data.get('conclusion', instance.conclusion)
        instance.medication = validated_data.get('medication', instance.medication)
        instance.save()
        return instance


class DoctorCreateSerializer(DoctorDetailSerializer):
    """Serializer for admin creating a doctor with availability input."""
    availabilities = serializers.JSONField(write_only=True)

    class Meta(DoctorDetailSerializer.Meta):
        fields = DoctorDetailSerializer.Meta.fields + ['availabilities']

    def validate_availabilities(self, value):
        if isinstance(value, str):
            import json
            try:
                value = json.loads(value)
            except json.JSONDecodeError:
                raise serializers.ValidationError("Invalid availabilities format")
        return value

    def create(self, validated_data):
        availabilities_data = validated_data.pop('availabilities', [])
        validated_data['user_type'] = 'doctor'
        doctor = User.objects.create(**validated_data)

        # Create availabilities
        for avail in availabilities_data:
            DoctorAvailability.objects.create(doctor=doctor, **avail)

        return doctor


class AdminSwapSerializer(serializers.Serializer):
    """Serializer for admin account swap."""
    new_email = serializers.EmailField()
    current_otp = serializers.CharField(max_length=6)
    new_otp = serializers.CharField(max_length=6)
