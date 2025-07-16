FROM node:20-alpine AS builder

WORKDIR /frontend-test

# 1. Copy dependency manifest files
COPY package*.json ./

# 2. Install dependencies
RUN npm install

# 3. Copy the rest of your application code
COPY . .

# 4. Build the app
RUN NEXT_DISABLE_ESLINT=1 npm run build

# Production image
FROM node:20-alpine

WORKDIR /frontend-test
COPY --from=builder /frontend-test ./

EXPOSE 3000
CMD ["npm", "start"]