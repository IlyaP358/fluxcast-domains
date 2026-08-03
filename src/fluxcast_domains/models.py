"""Pydantic models for the structural shape of a domain file."""

from __future__ import annotations

from typing import Any

from pydantic import BaseModel, ConfigDict, Field


class Owner(BaseModel):
    model_config = ConfigDict(extra="forbid")

    username: str
    email: str | None = None

class RedirectConfig(BaseModel):
    model_config = ConfigDict(extra="forbid")

    custom_paths: dict[str, str] | None = None
    redirect_paths: bool | None = None
    # Issue a 301 instead of the default 302. Only set this once the target is
    # final: browsers cache permanent redirects aggressively.
    permanent: bool | None = None


class Domain(BaseModel):
    model_config = ConfigDict(extra="forbid")

    owner: Owner
    # Record values are validated in detail by the validation module.
    records: dict[str, Any] = Field(min_length=1)
    proxied: bool | None = None
    redirect_config: RedirectConfig | None = None
