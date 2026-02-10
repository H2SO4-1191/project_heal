from rest_framework import permissions


class IsAuthenticated(permissions.BasePermission):
    """
    Check if a user is logged in.
    """
    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated


class IsAdmin(permissions.BasePermission):
    """
    Check if a user is of type admin.
    """
    def has_permission(self, request, view):
        return (
            request.user and 
            request.user.is_authenticated and 
            request.user.user_type == 'admin'
        )


class IsPatient(permissions.BasePermission):
    """
    Check if the user is of type patient.
    """
    def has_permission(self, request, view):
        return (
            request.user and 
            request.user.is_authenticated and 
            request.user.user_type == 'patient'
        )


class IsDoctor(permissions.BasePermission):
    """
    Check if a user is of type doctor.
    """
    def has_permission(self, request, view):
        return (
            request.user and 
            request.user.is_authenticated and 
            request.user.user_type == 'doctor'
        )


class OwnsAppointment(permissions.BasePermission):
    """
    Check if a user owns an appointment (either as patient or doctor).
    This is an object-level permission.
    """
    def has_object_permission(self, request, view, obj): # type: ignore
        # Check if user is authenticated
        if not request.user or not request.user.is_authenticated:
            return False
        
        # Admin can access all appointments
        if request.user.user_type == 'admin':
            return True
        
        # Patient can access their own appointments
        if request.user.user_type == 'patient' and obj.patient == request.user:
            return True
        
        # Doctor can access appointments where they are the doctor
        if request.user.user_type == 'doctor' and obj.doctor == request.user:
            return True
        
        return False
