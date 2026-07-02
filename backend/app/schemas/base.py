from pydantic import BaseModel, ConfigDict
from pydantic.alias_generators import to_camel


class CamelModel(BaseModel):
    """
    Base for every request/response schema.

    - Emits camelCase JSON on output (FastAPI's jsonable_encoder serializes
      Pydantic models with by_alias=True), matching what the original
      Next.js/Prisma API produced.
    - Accepts camelCase JSON on input (validates against the alias), while
      populate_by_name=True still allows constructing instances from Python
      with the snake_case field name directly.
    """
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True, from_attributes=True)
