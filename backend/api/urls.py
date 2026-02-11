from rest_framework_simplejwt.views import TokenRefreshView
from django.urls import path
from .views import *

urlpatterns = [
    # ==================== Authentication ====================
    path('auth/signup/', PatientSignupView.as_view(), name='patient-signup'),
    path('auth/otp/request/', OTPRequestView.as_view(), name='otp-request'),
    path('auth/otp/verify/', OTPVerifyView.as_view(), name='otp-verify'),
    path('auth/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    
    # ==================== Patients ====================
    path('doctors/', DoctorListView.as_view(), name='doctor-list'),
    path('doctors/<int:pk>/', DoctorDetailView.as_view(), name='doctor-detail'),
    path('appointments/', PatientAppointmentListView.as_view(), name='patient-appointments'),
    path('appointments/create/', AppointmentCreateView.as_view(), name='appointment-create'),
    path('appointments/<int:pk>/', AppointmentDetailView.as_view(), name='appointment-detail'),
    path('appointments/<int:pk>/cancel/', AppointmentCancelView.as_view(), name='appointment-cancel'),
    
    # ==================== Doctors ====================
    path('doctors/me/appointments/today/', DoctorTodayAppointmentsView.as_view(), name='doctor-today-appointments'),
    path('doctors/appointments/<int:pk>/', DoctorAppointmentDetailView.as_view(), name='doctor-appointment-detail'),
    path('appointments/<int:pk>/conclude/', AppointmentConcludeView.as_view(), name='appointment-conclude'),
    
    # ==================== Admin ====================
    path('mod/doctors/', AdminDoctorListView.as_view(), name='mod-doctor-list'),
    path('mod/doctors/create/', AdminDoctorCreateView.as_view(), name='mod-doctor-create'),
    path('mod/doctors/<int:pk>/', AdminDoctorDeleteView.as_view(), name='mod-doctor-delete'),
    path('mod/patients/', AdminPatientListView.as_view(), name='mod-patient-list'),
    path('mod/patients/<int:pk>/', AdminPatientDeleteView.as_view(), name='mod-patient-delete'),
    path('mod/appointments/', AdminAppointmentListView.as_view(), name='mod-appointment-list'),
    path('mod/appointments/<int:pk>/', AdminAppointmentDeleteView.as_view(), name='mod-appointment-delete'),
    path('mod/swap-mod/', AdminSwapView.as_view(), name='mod-swap'),
]
