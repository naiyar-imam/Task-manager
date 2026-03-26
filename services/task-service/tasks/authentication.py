from dataclasses import dataclass

from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.exceptions import InvalidToken


@dataclass
class ServiceUser:
    id: int
    username: str = ""
    email: str = ""
    first_name: str = ""
    last_name: str = ""

    @property
    def is_authenticated(self):
        return True

    @property
    def is_anonymous(self):
        return False

    @property
    def pk(self):
        return self.id

    def get_full_name(self):
        full_name = f"{self.first_name} {self.last_name}".strip()
        return full_name or self.username


class ServiceJWTAuthentication(JWTAuthentication):
    def get_user(self, validated_token):
        user_id = validated_token.get(self.user_id_claim)
        if user_id is None:
            raise InvalidToken("Token contained no recognizable user identification")

        return ServiceUser(
            id=int(user_id),
            username=validated_token.get("username", ""),
            email=validated_token.get("email", ""),
            first_name=validated_token.get("first_name", ""),
            last_name=validated_token.get("last_name", ""),
        )
