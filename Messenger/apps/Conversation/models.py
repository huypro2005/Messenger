from django.db import models

class Conversation(models.Model):
    class TYPE(models.TextChoices):
        PRIVATE = 'private', 'private'
        GROUP = 'group', 'group'

    type = models.CharField(max_length=30, choices=TYPE.choices, default=TYPE.PRIVATE)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    unique_1_to_1_index = models.CharField(max_length=40, null=True, default=None)