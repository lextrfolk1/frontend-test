# Build stage
FROM node:20-alpine AS builder

WORKDIR /frontend-test

# 1. Copy dependency manifest files
COPY package*.json ./

# 2. Install dependencies
RUN npm install

# 3. Copy the rest of your application code
COPY . .

# Set environment variable properly before build
ENV NEXT_DISABLE_ESLINT=1
RUN npm run build

# Production stage
FROM node:20-alpine

WORKDIR /frontend-test
COPY --from=builder /frontend-test ./

EXPOSE 3000
CMD ["npm", "start"]