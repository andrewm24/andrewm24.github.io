from django.contrib.auth.models import AbstractUser
from django.db import models
from django.utils import timezone


class User(AbstractUser):
    """Custom user model allowing extension later."""
    pass


class Settings(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE)
    goal_minutes = models.IntegerField(default=60)
    theme = models.CharField(max_length=20, default="fire")
    partner_pokemon = models.IntegerField(default=1)


class FocusStat(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    date = models.DateField()
    minutes = models.IntegerField(default=0)
    sessions = models.IntegerField(default=0)
    xp_gained = models.IntegerField(default=0)

    class Meta:
        unique_together = ("user", "date")


class JournalEntry(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    date = models.DateField()
    text = models.TextField()
    mood = models.CharField(max_length=1)
    tags = models.JSONField(default=list, blank=True)
    media = models.FileField(upload_to="journal_media", null=True, blank=True)

    class Meta:
        unique_together = ("user", "date")


class PokemonProgress(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    pokemon_id = models.IntegerField()
    xp = models.IntegerField(default=0)
    level = models.IntegerField(default=1)
    captured_at = models.DateTimeField(default=timezone.now)
    sessions_contributed = models.IntegerField(default=0)

    class Meta:
        unique_together = ("user", "pokemon_id")


class XPLog(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    ts = models.DateTimeField(default=timezone.now)
    delta = models.IntegerField()
    reason = models.CharField(max_length=100)


class Group(models.Model):
    id = models.SlugField(primary_key=True)


class GroupMember(models.Model):
    class Roles(models.TextChoices):
        OWNER = "owner", "Owner"
        MEMBER = "member", "Member"

    group = models.ForeignKey(Group, on_delete=models.CASCADE)
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    role = models.CharField(max_length=10, choices=Roles.choices, default=Roles.MEMBER)

    class Meta:
        unique_together = ("group", "user")


class GroupEvent(models.Model):
    group = models.ForeignKey(Group, on_delete=models.CASCADE)
    ts = models.DateTimeField(default=timezone.now)
    kind = models.CharField(max_length=50)
    payload = models.JSONField(default=dict, blank=True)
