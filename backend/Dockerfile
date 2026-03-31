FROM node:18-alpine AS builder

WORKDIR /app

# Install OpenSSL for Prisma (resolves P5010 error)
RUN apk update && apk add --no-cache openssl

# Copy package and install dependencies
COPY backend/package.json backend/package-lock.json* ./
RUN npm install --ignore-scripts --legacy-peer-deps

# Copy backend source
COPY backend/ ./

# Generate Prisma client and build
RUN npx prisma generate
RUN npm run build

# Production stage
FROM node:18-alpine

WORKDIR /app

# Install OpenSSL for Prisma
RUN apk update && apk add --no-cache openssl

# Copy built artifacts and dependencies
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json


ENV NODE_ENV=production
ENV PORT=3001
EXPOSE 3001

CMD ["npm", "start"]
