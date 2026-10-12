#!/usr/bin/env bash
# Gera e publica a imagem do C4 Board no Docker Hub (finstackacademy/c4-board)
# para linux/amd64 e linux/arm64, com a tag da versao do package.json e
# `latest`. O build roda os testes: nada e publicado se eles falharem.
#
# Uso:
#   scripts/release.sh             gera e publica
#   scripts/release.sh --dry-run   so gera (as duas plataformas), sem publicar
#
# Antes da primeira vez: docker login -u finstackacademy (com um token
# Read & Write do Docker Hub no lugar da senha).
set -euo pipefail

IMAGE="${IMAGE:-finstackacademy/c4-board}"
PLATFORMS="${PLATFORMS:-linux/amd64,linux/arm64}"
BUILDER="c4-board-multi"

dry_run=false
case "${1:-}" in
  "") ;;
  --dry-run) dry_run=true ;;
  -h|--help) sed -n '2,11p' "$0" | sed 's/^# \{0,1\}//'; exit 0 ;;
  *) echo "Opção desconhecida: $1 (use --dry-run ou --help)" >&2; exit 2 ;;
esac

cd "$(dirname "$0")/.."

fail() { echo "✗ $*" >&2; exit 1; }
step() { echo "→ $*"; }

command -v docker >/dev/null || fail "docker não encontrado."
docker info >/dev/null 2>&1 || fail "o Docker não está rodando."
docker buildx version >/dev/null 2>&1 || fail "docker buildx não está disponível."

version="$(node -p "require('./package.json').version" 2>/dev/null)" || fail "não consegui ler a versão do package.json."
[[ "$version" =~ ^[0-9]+\.[0-9]+\.[0-9]+([-.][0-9A-Za-z.]+)?$ ]] || fail "versão inválida no package.json: $version"

# Uma tag publicada nao muda: quem fixou 0.1.0 espera sempre a mesma imagem.
if ! $dry_run && docker buildx imagetools inspect "$IMAGE:$version" >/dev/null 2>&1; then
  fail "$IMAGE:$version já existe no Docker Hub. Suba a versão no package.json (ex.: npm version patch --no-git-tag-version) e rode de novo."
fi

# Publicar o que nao esta no git dificulta saber o que foi para a imagem.
if git rev-parse --is-inside-work-tree >/dev/null 2>&1 && [ -n "$(git status --porcelain 2>/dev/null)" ]; then
  echo "! Há alterações não commitadas; a imagem vai incluir o estado atual dos arquivos."
fi

# O builder padrao pode nao suportar varias plataformas; um builder
# docker-container suporta.
if ! docker buildx inspect "$BUILDER" >/dev/null 2>&1; then
  step "Criando o builder $BUILDER"
  docker buildx create --name "$BUILDER" --driver docker-container >/dev/null
fi

revision="$(git rev-parse --short HEAD 2>/dev/null || echo unknown)"
created="$(date -u +%Y-%m-%dT%H:%M:%SZ)"

args=(
  --builder "$BUILDER"
  --platform "$PLATFORMS"
  --tag "$IMAGE:$version"
  --tag "$IMAGE:latest"
  --label "org.opencontainers.image.version=$version"
  --label "org.opencontainers.image.revision=$revision"
  --label "org.opencontainers.image.created=$created"
)

if $dry_run; then
  step "Gerando $IMAGE:$version para $PLATFORMS (dry-run, sem publicar)"
  docker buildx build "${args[@]}" .
  echo "✓ Build ok. Nada foi publicado."
  exit 0
fi

step "Gerando e publicando $IMAGE:$version e :latest para $PLATFORMS"
docker buildx build "${args[@]}" --push . || fail "o build ou o push falhou. Se for autenticação, rode: docker login -u ${IMAGE%%/*}"

step "Conferindo o que foi publicado"
docker buildx imagetools inspect "$IMAGE:$version" | grep -E "Name:|Platform:" || true
echo "✓ Publicado: $IMAGE:$version e $IMAGE:latest"
echo "  docker run -d -p 8080:8080 --name c4-board $IMAGE:$version"
