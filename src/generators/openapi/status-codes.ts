export const NoContent = {
  204: {
    $ref: `#/components/responses/NoContent`,
  },
};

export const BadRequestError = {
  400: {
    $ref: `#/components/responses/BadRequest`,
  },
};

export const UnauthorizedError = {
  401: {
    $ref: `#/components/responses/Unauthorized`,
  },
};

export const ForbiddenError = {
  403: {
    $ref: `#/components/responses/Forbidden`,
  },
};

export const NotFoundError = {
  404: {
    $ref: `#/components/responses/NotFound`,
  },
};

export const ConflictError = {
  409: {
    $ref: `#/components/responses/Conflict`,
  },
};

export const PreConditionsFailedError = {
  412: {
    $ref: `#/components/responses/PreConditionsFailed`,
  },
};

export const InternalServerError = {
  500: {
    $ref: `#/components/responses/InternalServerError`,
  },
};

export const CommonErrors = {
  ...UnauthorizedError,
  ...ForbiddenError,
  ...InternalServerError,
};
