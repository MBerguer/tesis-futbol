# Dockerfile
FROM rust:latest

# Install PostgreSQL client
RUN apt-get update && apt-get install -y postgresql-client

# Set working directory
WORKDIR /usr/src/app

# Copy project files
COPY . .

# Expose port
EXPOSE 8000

# Run cargo build to install dependencies
RUN cargo build

# Command to start the application
CMD ["cargo", "run"]
