# alx-files-manager

This is a Node.js application that implements a basic files manager API. Users can sign up, store files (text and images), and manage them through the API.

### Requirements
- Node.js and npm

### Setup

1. Clone this repository:
```
Bash
git clone https://github.com/your-username/alx-files-manager.git
```

2. Install the dependencies:

```
Bash
cd alx-files-manager
npm install
```

### Environment Variables

- ``DB_HOST``: The hostname of the MongoDB database (default: localhost)
- ``DB_PORT``: The port of the MongoDB database (default: 27017)
- ``DB_DATABASE``: The name of the MongoDB database (default: files_manager)
- ``PORT``: The port of the Node.js server (default: 5000)
- ``FOLDER_PATH``: The path to the folder where uploaded files will be stored (default: /tmp/files_manager)

### Running the application

1. Set the environment variables (if needed).
2. Start the server:

```
Bash
npm run start-server
```

###API Endpoints

### GET /status

Checks if the Redis and MongoDB connections are alive.

### GET /stats

Returns the number of users and files in the database.

### POST /users

Creates a new user.

#### Body:
```
JSON
{
  "email": "user@example.com",
  "password": "password123"
}
```

#### Response:
```
JSON
{
  "id": "user_id",
  "email": "user@example.com"
}
```

### GET /connect

Signs in a user and generates a new authentication token.

<b>Authorization</b>: Basic authentication with email and password.

#### Response:
```
JSON
{
  "token": "authentication_token"
}
```

### GET /disconnect

Signs out a user by invalidating their authentication token.

<b>Authorization</b>: Bearer token.

### GET /users/me

Retrieves the authenticated user's information.

<b>Authorization</b>: Bearer token.

### POST /files

Creates a new file.

#### Body:

```
JSON
{
  "name": "file_name.txt",
  "type": "file" (or "image" or "folder"),
  "data": "base64_encoded_file_content" (for type "file" or "image" only),
  "parentId": "parent_file_id" (optional),
  "isPublic": true (optional)
}
```
#### Response:

```
JSON
{
  "id": "file_id",
  "name": "file_name.txt",
  "type": "file",
  "parentId": "parent_file_id" (if provided),
  "isPublic": true
}
```
### GET /files/:id

Retrieves a file by its ID.

<b>Authorization</b>: Bearer token.

### GET /files

Retrieves a list of files for the authenticated user, optionally filtered by parent ID and paginated.

### Query parameters:

- ``parentId``: The ID of the parent folder (optional).
- ``page``: The current page number (optional, defaults to 0).

<b>Authorization</b>: Bearer token.

### PUT /files/:id/publish

Publishes a file (makes it publicly accessible).

<b>Authorization</b>: Bearer token.

### PUT /files/:id/unpublish

Unpublishes a file (makes it private).

<b>Authorization</b>: Bearer token.

### GET /files/:id/data

Retrieves the content of a file.

<b>Authorization</b>: Bearer token (if the file is not public).

### Error Codes

- 400: Bad request
- 401: Unauthorized
- 404: Not found
- 500: Internal server error

### Additional Notes

- Passwords are stored as SHA-1 hashes in the database.
- Authentication tokens are stored in Redis and expire after 24 hours.
- Files are stored on the server's filesystem.

### Further Development

- Implement access control for files and folders.
- Add support for different file types.
- Implement search functionality.
- Improve error handling.
- Add unit and integration tests.
