import os, random, string
from django.db import migrations
from django.utils import timezone
from datetime import timedelta, date

def random_email():
    prefix = ''.join(random.choices(string.ascii_lowercase + string.digits, k=8))
    return f'{prefix}@medicare.com'

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
        'أحمد', 'محمد', 'علي', 'حسن', 'عمر', 'يوسف', 'خالد', 'إبراهيم',
        'فيصل', 'طارق', 'رامي', 'سمير', 'ناصر', 'سامي', 'زياد', 'ماجد',
        'كريم', 'فهد', 'حسين', 'عدنان', 'بلال', 'محمود', 'أمير', 'راشد',
    ]

    female_names = [
        "عالية", "أميرة", "آية", "دلال", "فرح", "هالة", "إيمان", "جمانة",
        "خالدة", "لينا", "مها", "مريم", "ندى", "نورة", "رانية", "ريم",
        "سلمى", "سارة", "ياسمين", "زهرة", "ليلى", "دانا", "هدى", "سناء", "ريما"
    ]

    last_names = [
        'الفلان', 'الحكيم', 'المصري', 'الشريف', 'الأميري', 'الصالح', 'الخليل',
        'القاضي', 'الجباري', 'الحسن', 'الرشيد', 'المجيد', 'النجار', 'التميمي',
        'الصايغ', 'الحبيب', 'الفاروق', 'الأمين', 'الكريم', 'الدين', 'البداوي',
        'الغازي', 'الخطيب', 'المهدي', 'الراوي', 'الفهد', 'النصر', 'الطاهر',
        'الزهراني', 'الجزري', 'الهمدان', 'الصباح', 'المطيري', 'البغدادي',
        'القريشي', 'السعود', 'الفياض', 'العجمي', 'الطالب', 'الدباغ', 'السعدي',
        'الحارثي', 'الرشوان', 'المنصور', 'الشهري', 'الحسين', 'الكويتي',
        'المسعود', 'الكندي', 'الصراف'
    ]

    chronic_diseases_list = [
        'لا شيء',
        'داء السكري من النوع 2',
        'ارتفاع ضغط الدم',
        'الربو',
        'داء السكري من النوع 2، ارتفاع ضغط الدم',
        'التهاب المفاصل',
        'ارتفاع الكوليسترول',
        'اضطراب الغدة الدرقية',
        'آلام الظهر المزمنة',
        'الصداع النصفي',
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
            email=random_email(),
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
        'طب القلب',
        'طب الأعصاب',
        'جراحة العظام',
        'طب الأطفال',
        'طب الجلدية',
        'الطب النفسي',
        'علم الأورام',
        'أمراض الجهاز الهضمي',
        'جراحة المسالك البولية',
        'طب النساء',
        'الطب الباطني',
        'طب الأسرة'
    ]
    
    about_templates = [
        'أخصائي معتمد من المجلس الطبي بخبرة تزيد عن {} سنوات في {}.',
        'أخصائي {} ذو خبرة ملتزم بتقديم رعاية شاملة للمرضى.',
        'طبيب مخلص متخصص في {} مع التركيز على العلاج المبني على الأدلة.',
        'شغوف بـ {} ومساعدة المرضى على تحقيق أفضل النتائج الصحية.',
        'خبير في {} مع تدريب واسع في أساليب العلاج الحديثة.'
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
            email=random_email(),
            user_type='doctor',
            full_name=f'د. {first} {last}',
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
