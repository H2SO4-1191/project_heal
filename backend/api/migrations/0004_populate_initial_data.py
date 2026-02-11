import os
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
    male_names = [
        'Ahmad', 'Mohammed', 'Ali', 'Hassan', 'Omar', 'Youssef', 'Khalid', 'Ibrahim',
        'Faisal', 'Tariq', 'Rami', 'Samir', 'Nasser', 'Sami', 'Ziad', 'Majid',
        'Karim', 'Fahad', 'Hussein', 'Adnan', 'Bilal', 'Mahmoud', 'Amir', 'Rashid',
    ]

    female_names = [
        "Aaliyah", "Amira", "Aya", "Dalal", "Farah", "Hala", "Iman", "Jumana", 
        "Khalida", "Lina", "Maha", "Mariam", "Nada", "Noura", "Rania", "Reem", 
        "Salma", "Sara", "Yasmin", "Zahra", "Layla", "Dana", "Huda", "Sana", "Rima"
    ]

    last_names = [
        'Al-Fulan', 'Al-Hakim', 'Al-Masri', 'Al-Sharif', 'Al-Amiri', 'Al-Saleh', 'Al-Khalil', 
        'Al-Qadi', 'Al-Jabari', 'Al-Hassan', 'Al-Rashid', 'Al-Majid', 'Al-Najjar', 'Al-Tamimi', 
        'Al-Sayegh', 'Al-Habib', 'Al-Farouq', 'Al-Amin', 'Al-Karim', 'Al-Din', 'Al-Badawi', 
        'Al-Ghazi', 'Al-Khatib', 'Al-Mahdi', 'Al-Rawi', 'Al-Fahad', 'Al-Nasser', 'Al-Taher', 
        'Al-Zahrani', 'Al-Jazari', 'Al-Hamdan', 'Al-Sabah', 'Al-Mutairi', 'Al-Baghdadi', 
        'Al-Quraishi', 'Al-Saud', 'Al-Fayez', 'Al-Ajmi', 'Al-Taleb', 'Al-Dabbagh', 'Al-Saadi', 
        'Al-Harthy', 'Al-Rashwan', 'Al-Mansour', 'Al-Shehri', 'Al-Hussein', 'Al-Kuwaiti', 
        'Al-Masoud', 'Al-Kindi', 'Al-Sarraf'
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
        gender = random.choice(genders)
        first = random.choice(male_names) if gender == 'male' else random.choice(female_names)
        last = random.choice(last_names)
        
        # Generate birth date (age between 18 and 80)
        age = random.randint(18, 80)
        birth_date = date.today() - timedelta(days=age*365 + random.randint(0, 365))
        
        patient = User.objects.create(
            email=f'{first.lower()}.{last.lower()}{i}@email.com',
            user_type='patient',
            full_name=f'{first} {last}',
            phone_number=f'+964{random.randint(2000000000, 9999999999)}',
            birth_date=birth_date,
            gender=gender,
            chronic_diseases=random.choice(chronic_diseases_list),
            is_active=True
        )
        patients.append(patient)
    
    # Doctor specialties
    specialties = [
        'Cardiology', 
        'Neurology', 
        'Orthopedics', 
        'Pediatrics', 
        'Dermatology',
        'Psychiatry', 
        'Oncology', 
        'Gastroenterology', 
        'Urology',
        'Gynecology', 
        'Internal Medicine', 
        'Family Medicine'
    ]

    
    doctor_titles = ['Dr.']
    
    about_templates = [
        'Board-certified specialist with over {} years of experience in {}.',
        'Experienced {} specialist committed to providing comprehensive patient care.',
        'Dedicated physician specializing in {} with a focus on evidence-based treatment.',
        'Passionate about {} and helping patients achieve optimal health outcomes.',
        'Expert in {} with extensive training in modern treatment methodologies.',
    ]
    
    days_of_week = ['saturday', 'sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday',]
    
    image_files = os.listdir('media/doctors')
    random.shuffle(image_files)

    doctors = []
    for i, image_file in enumerate(image_files, start=1):
        name_part = image_file.split('.')[0]
        gender = 'female' if name_part.startswith('f') else 'male'
    
        # Pick first name based on gender
        first = random.choice(male_names) if gender == 'male' else random.choice(female_names)
        last = random.choice(last_names)
    
        specialty = specialties[i % len(specialties)]  # cycle through specialties
        years_exp = random.randint(2, 8)
        about = random.choice(about_templates).format(years_exp, specialty.lower())
    
        doctor = User.objects.create(
            email=f'dr.{first.lower()}.{last.lower()}{i}@medicare.com',
            user_type='doctor',
            full_name=f'Dr. {first} {last}',
            phone_number=f'+964{random.randint(2000000000, 9999999999)}',
            specialty=specialty,
            about=about,
            image=f'doctors/{image_file}',  # set the image field
            is_active=True
        )
        doctors.append(doctor)
    
        # Create 2-4 availability slots
        num_days = random.randint(2, 6)
        selected_days = random.sample(days_of_week, num_days)
        for day in selected_days:
            start_hour = random.randint(8, 10)
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
