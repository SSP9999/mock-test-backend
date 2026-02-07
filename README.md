# Mock Test Backend - SSO Documentation

This backend supports Single Sign-On (SSO) login via a JWT token passed in the URL.

## SSO Authentication Flow

1.  **External Token**: The external website generates a JWT token containing user information.
2.  **Redirect**: The user is redirected to the SSO landing page (frontend) with the token in the URL:
    `https://your-frontend-app.com/sso?X-External-Token=YOUR_JWT_TOKEN`
3.  **Backend Verification**: The frontend calls the backend SSO endpoint with this token.
4.  **Auto Login/Signup**: The backend verifies the token. If the user exists, they are logged in. If not, a new account is created automatically.
5.  **Session Establishment**: The backend returns a local JWT token and user information, which the frontend should use for subsequent authenticated requests.

## API Endpoint

### SSO Login/Signup

`GET /api/sso`

**Query Parameters:**

| Parameter | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `X-External-Token` | string | Yes | The JWT token from the external system. |

**External Token Payload Requirements:**

The JWT token should be signed with the shared secret (`external-secret-key`) and contain at least one of the following fields in its payload:

-   `email`: User's email address.
-   `username`: User's username.
-   `sub`: Subject (unique user ID).

Example payload:
```json
{
  "username": "johndoe",
  "email": "john@example.com",
  "iat": 1600000000,
  "exp": 1700000000
}
```

**Success Response:**

-   **Code:** 200 OK
-   **Content:**
```json
{
  "message": "SSO Login successful",
  "token": "LOCAL_APP_JWT_TOKEN",
  "user": {
    "id": 1,
    "name": "johndoe",
    "email": "john@example.com"
  }
}
```

**Error Responses:**

-   **Code:** 400 Bad Request (Missing token or missing identification in token)
-   **Code:** 401 Unauthorized (Invalid or expired token)
-   **Code:** 500 Internal Server Error

## Implementation Details

-   **Shared Secret**: The backend uses `external-secret-key` to verify external tokens.
-   **User Creation**: If the user is new, a random password is generated and the user is flagged as an SSO user.
-   **Local Token**: The returned `token` is signed with the backend's own `JWT_SECRET` and should be used in the `Authorization` header for other API calls:
    `Authorization: Bearer <LOCAL_APP_JWT_TOKEN>`

## Existing Auth Endpoints

### Signup
`POST /api/signup`
Payload: `{ "name": "...", "email": "...", "password": "..." }`

### Login
`POST /api/login`
Payload: `{ "email": "...", "password": "..." }`
