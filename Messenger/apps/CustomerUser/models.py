from django.db import models
from django.contrib.auth.models import AbstractUser

class CustomerUser(AbstractUser):
    class Meta:
        db_table = 'customeruser'