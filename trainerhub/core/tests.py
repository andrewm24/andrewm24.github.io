from django.urls import reverse
from rest_framework.test import APITestCase
from django.contrib.auth import get_user_model
from .models import PokemonProgress, XPLog


class XPGainTests(APITestCase):
    def setUp(self):
        self.user = get_user_model().objects.create_user(username="test", password="pass")
        response = self.client.post(reverse("token_obtain_pair"), {"username": "test", "password": "pass"})
        self.token = response.data["access"]

    def auth(self):
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self.token}")

    def test_gain_xp(self):
        self.auth()
        url = reverse("pokemon-gain-xp")
        resp = self.client.post(url, {"pokemon_id": 1, "delta": 10})
        self.assertEqual(resp.status_code, 200)
        prog = PokemonProgress.objects.get(user=self.user, pokemon_id=1)
        self.assertEqual(prog.xp, 10)
        self.assertEqual(XPLog.objects.filter(user=self.user).count(), 1)
