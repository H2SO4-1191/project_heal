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
