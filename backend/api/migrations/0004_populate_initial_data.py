from django.db import migrations
from django.utils import timezone
import random
from datetime import timedelta, date


def generate_initial_data(apps, schema_editor):
    User = apps.get_model('api', 'User') 
    DoctorAvailability = apps.get_model('api', 'DoctorAvailability')
    
    # Create Admin
    admin = User.objects.create(
        email='admin@medicare.com',
        user_type='admin',
        is_staff=True,
        is_superuser=True,
        is_active=True
    )
    admin.save()
    
    # Patient data
    first_names = [
        'James', 'Mary', 'John', 'Patricia', 'Robert', 'Jennifer', 'Michael', 'Linda',
        'William', 'Barbara', 'David', 'Elizabeth', 'Richard', 'Susan', 'Joseph', 'Jessica',
        'Thomas', 'Sarah', 'Charles', 'Karen', 'Christopher', 'Nancy', 'Daniel', 'Lisa',
        'Matthew', 'Betty', 'Anthony', 'Margaret', 'Mark', 'Sandra', 'Donald', 'Ashley',
        'Steven', 'Kimberly', 'Paul', 'Emily', 'Andrew', 'Donna', 'Joshua', 'Michelle',
        'Kenneth', 'Carol', 'Kevin', 'Amanda', 'Brian', 'Dorothy', 'George', 'Melissa',
        'Timothy', 'Deborah'
    ]
    
    last_names = [
        'Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis',
        'Rodriguez', 'Martinez', 'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson',
        'Thomas', 'Taylor', 'Moore', 'Jackson', 'Martin', 'Lee', 'Perez', 'Thompson',
        'White', 'Harris', 'Sanchez', 'Clark', 'Ramirez', 'Lewis', 'Robinson', 'Walker',
        'Young', 'Allen', 'King', 'Wright', 'Scott', 'Torres', 'Nguyen', 'Hill', 'Flores',
        'Green', 'Adams', 'Nelson', 'Baker', 'Hall', 'Rivera', 'Campbell', 'Mitchell',
        'Carter', 'Roberts'
    ]
    
    chronic_diseases_list = [
        'None',
        'Diabetes Type 2',
        'Hypertension',
        'Asthma',
        'Diabetes Type 2, Hypertension',
        'Arthritis',
        'High Cholesterol',
        'Thyroid Disorder',
        'Chronic Back Pain',
        'Migraine',
        ''
    ]
    
    genders = ['male', 'female']
    
    # Create 25 Patients
    patients = []
    for i in range(25):
        first = random.choice(first_names)
        last = random.choice(last_names)
        gender = random.choice(genders)
        
        # Generate birth date (age between 18 and 80)
        age = random.randint(18, 80)
        birth_date = date.today() - timedelta(days=age*365 + random.randint(0, 365))
        
        patient = User.objects.create(
            email=f'{first.lower()}.{last.lower()}{i}@email.com',
            user_type='patient',
            full_name=f'{first} {last}',
            phone_number=f'+1{random.randint(2000000000, 9999999999)}',
            birth_date=birth_date,
            gender=gender,
            chronic_diseases=random.choice(chronic_diseases_list),
            is_active=True
        )
        patients.append(patient)
    
    # Doctor specialties
    specialties = [
        'Cardiology', 'Neurology', 'Orthopedics', 'Pediatrics', 'Dermatology',
        'Psychiatry', 'Oncology', 'Gastroenterology', 'Endocrinology', 'Pulmonology',
        'Nephrology', 'Rheumatology', 'Ophthalmology', 'ENT (Otolaryngology)', 
        'Urology', 'Gynecology', 'Obstetrics', 'Allergy and Immunology',
        'Anesthesiology', 'Radiology', 'Emergency Medicine', 'Family Medicine',
        'Internal Medicine', 'Sports Medicine', 'Physical Medicine'
    ]
    
    doctor_titles = ['Dr.']
    
    about_templates = [
        'Board-certified specialist with over {} years of experience in {}.',
        'Experienced {} specialist committed to providing comprehensive patient care.',
        'Dedicated physician specializing in {} with a focus on evidence-based treatment.',
        'Passionate about {} and helping patients achieve optimal health outcomes.',
        'Expert in {} with extensive training in modern treatment methodologies.',
    ]
    
    days_of_week = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
    
    # Create 25 Doctors
    doctors = []
    for i in range(25):
        first = random.choice(first_names)
        last = random.choice(last_names)
        specialty = specialties[i] if i < len(specialties) else random.choice(specialties)
        
        years_exp = random.randint(5, 30)
        about = random.choice(about_templates).format(years_exp, specialty.lower())
        
        doctor = User.objects.create(
            email=f'dr.{first.lower()}.{last.lower()}{i}@medicare.com',
            user_type='doctor',
            full_name=f'Dr. {first} {last}',
            phone_number=f'+1{random.randint(2000000000, 9999999999)}',
            specialty=specialty,
            about=about,
            is_active=True
        )
        doctors.append(doctor)
        
        # Create 2-4 availability slots for each doctor
        num_days = random.randint(2, 4)
        selected_days = random.sample(days_of_week, num_days)
        
        for day in selected_days:
            # Random start time between 8 AM and 10 AM
            start_hour = random.randint(8, 10)
            # Work day of 6-8 hours
            work_hours = random.randint(6, 8)
            end_hour = start_hour + work_hours
            
            DoctorAvailability.objects.create(
                doctor=doctor,
                day=day,
                start_time=f'{start_hour:02d}:00:00',
                end_time=f'{end_hour:02d}:00:00'
            )


def reverse_initial_data(apps, schema_editor):
    User = apps.get_model('api', 'User')
    DoctorAvailability = apps.get_model('api', 'DoctorAvailability')
    
    # Delete all created data
    DoctorAvailability.objects.all().delete()
    User.objects.filter(email__endswith='@medicare.com').delete()
    User.objects.filter(email__endswith='@email.com').delete()


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0003_alter_user_gender'), 
    ]

    operations = [
        migrations.RunPython(generate_initial_data, reverse_initial_data),
    ]
