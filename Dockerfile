FROM denoland/deno:1.10.3

EXPOSE 3000

WORKDIR /app

USER deno

# Cache the dependencies as a layer (the following two steps are re-run only when deps.ts is modified).
# Ideally cache deps.ts will download and compile _all_ external files used in main.ts.
COPY deps.ts .
RUN deno cache deps.ts --no-check

ADD . .
# Compile the main app so that it doesn't need to be compiled each startup/entry.
RUN deno cache main.ts --no-check

CMD ["run", "--allow-net", "--allow-read", "--no-check", "main.ts"]