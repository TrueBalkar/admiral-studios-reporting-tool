from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # Postgres — asyncpg driver, e.g. postgresql+asyncpg://user:pass@host:5432/dbname
    database_url: str = "postgresql+asyncpg://admiral:admiral@localhost:5432/admiral"

    jwt_secret: str = "change-me-to-a-long-random-secret"
    jwt_algorithm: str = "HS256"
    jwt_expire_days: int = 7

    # Comma-separated list of allowed frontend origins (Vercel URL, localhost)
    cors_origins: str = "http://localhost:3000"

    cookie_name: str = "auth-token"
    # "none" is required for cross-origin cookies (Vercel frontend -> VPS backend).
    # Use "lax" only when frontend and backend share the same site/domain.
    cookie_samesite: str = "none"
    cookie_secure: bool = True

    environment: str = "development"

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]


settings = Settings()
