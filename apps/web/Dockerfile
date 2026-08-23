FROM node:22-alpine

WORKDIR /workspace
RUN corepack enable
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/web/package.json apps/web/package.json
RUN pnpm install --frozen-lockfile
COPY apps/web apps/web
COPY contracts contracts
EXPOSE 4173
CMD ["pnpm", "--dir", "apps/web", "dev", "--host", "0.0.0.0", "--port", "4173"]
