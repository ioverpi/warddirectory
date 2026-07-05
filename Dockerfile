# Ward Directory demo image: Node app + a LaTeX toolchain for the PDF booklet.
#
# Node 16 keeps this compatible with the app's 2020-era dependencies
# (mongoose 5, express 4) without any code changes.
FROM node:16-bullseye-slim

# pdflatex + only the LaTeX packages the booklet templates actually use
# (inputenc, geometry, grffile, graphicx, multirow, multicol). This is a few
# hundred MB rather than the multi-GB texlive-full.
RUN apt-get update && apt-get install -y --no-install-recommends \
      texlive-latex-base \
      texlive-latex-recommended \
      texlive-latex-extra \
      texlive-fonts-recommended \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install dependencies first so this layer caches across code changes.
COPY package.json package-lock.json ./
RUN npm install --omit=dev

# App source (see .dockerignore for what's skipped).
COPY . .

# The server reads ../public and ../photos relative to its own directory,
# so it must run from inside server/.
WORKDIR /app/server

CMD ["node", "server.js"]
