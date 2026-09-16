#!/usr/bin/env bash

set -euo pipefail

project_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$project_root"

if ! command -v adb >/dev/null 2>&1; then
  echo "Error: adb no está instalado o no está disponible en PATH." >&2
  exit 1
fi

adb start-server >/dev/null

target="$(
  adb devices |
    awk 'NR > 1 && $2 == "device" { print $1; exit }'
)"

if [[ -z "$target" ]]; then
  if adb devices | grep -q $'\tunauthorized$'; then
    echo "Error: el dispositivo está conectado pero no autorizado." >&2
    echo "Desbloquea el teléfono y acepta la depuración USB RSA." >&2
  else
    echo "Error: no se encontró ningún dispositivo Android autorizado." >&2
    echo "Activa Depuración USB y verifica el cable o la conexión inalámbrica." >&2
  fi
  echo
  adb devices -l
  exit 1
fi

echo "Ejecutando en el dispositivo Android: $target"
exec npx cap run android --target "$target" "$@"
