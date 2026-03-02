"""
TEST-1: Model Factories for Testing

Factory Boy factories for creating test instances of models.
These provide consistent, reproducible test data.
"""

import factory
from factory.django import DjangoModelFactory
from django.contrib.auth import get_user_model
from apps.core.models import County, Town, Landlord, Property

User = get_user_model()


class UserFactory(DjangoModelFactory):
    """Factory for creating User instances."""
    
    class Meta:
        model = User
        skip_postgeneration_save = True
    
    email = factory.Sequence(lambda n: f'user{n}@example.com')
    username = factory.LazyAttribute(lambda obj: obj.email)
    first_name = factory.Faker('first_name')
    last_name = factory.Faker('last_name')
    user_type = 'renter'
    is_active = True
    is_email_verified = True
    
    @factory.post_generation
    def password(self, create, extracted, **kwargs):
        password = extracted or 'testpass123'
        self.set_password(password)
        if create:
            self.save()


class LandlordUserFactory(UserFactory):
    """Factory for creating landlord users."""
    user_type = 'landlord'


class AdminUserFactory(UserFactory):
    """Factory for creating admin users."""
    user_type = 'admin'
    is_staff = True
    is_superuser = True


class CountyFactory(DjangoModelFactory):
    """Factory for creating County instances."""
    
    class Meta:
        model = County
        django_get_or_create = ('slug',)
    
    name = factory.Sequence(lambda n: f'County {n}')
    slug = factory.LazyAttribute(lambda obj: obj.name.lower().replace(' ', '-'))


class TownFactory(DjangoModelFactory):
    """Factory for creating Town instances."""
    
    class Meta:
        model = Town
        django_get_or_create = ('name', 'county')
    
    name = factory.Sequence(lambda n: f'Town {n}')
    county = factory.SubFactory(CountyFactory)
    slug = factory.LazyAttribute(lambda obj: obj.name.lower().replace(' ', '-'))


class LandlordFactory(DjangoModelFactory):
    """Factory for creating Landlord instances."""
    
    class Meta:
        model = Landlord
    
    name = factory.Faker('name')
    email = factory.Faker('email')
    phone = factory.Faker('phone_number')
    user_type = 'landlord'
    is_verified = False
    is_active = True


class VerifiedLandlordFactory(LandlordFactory):
    """Factory for creating verified Landlord instances."""
    is_verified = True
    verification_date = factory.Faker('date_time_this_year')


class PropertyFactory(DjangoModelFactory):
    """Factory for creating Property instances."""
    
    class Meta:
        model = Property
    
    title = factory.Faker('sentence', nb_words=4)
    description = factory.Faker('paragraph')
    property_type = 'apartment'
    listing_type = 'rent'
    bedrooms = factory.Faker('random_int', min=1, max=5)
    bathrooms = factory.Faker('random_int', min=1, max=3)
    price = factory.Faker('random_int', min=800, max=3000)
    county = factory.SubFactory(CountyFactory)
    town = factory.SubFactory(TownFactory)
    landlord = factory.SubFactory(LandlordFactory)
    address_line1 = factory.Faker('street_address')
    status = 'available'
    is_active = True
    
    @factory.lazy_attribute
    def eircode(self):
        # Generate a valid Irish eircode format
        import random
        import string
        routing_key = random.choice(string.ascii_uppercase) + str(random.randint(10, 99))
        unique_id = ''.join(random.choices(string.ascii_uppercase + string.digits, k=4))
        return f'{routing_key} {unique_id}'
