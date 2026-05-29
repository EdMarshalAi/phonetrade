# Деплой PhoneTrade

CI/CD: GitHub Actions (`.github/workflows/deploy.yml`) на каждый push в `main`:
собирает Next в режиме `standalone`, заливает по `rsync` на сервер и перезапускает
через PM2. nginx проксирует на `127.0.0.1:3000`.

## 1. Секреты в GitHub

Settings → Secrets and variables → Actions → **New repository secret**:

| Секрет | Значение | Пример |
|---|---|---|
| `SSH_HOST` | IP или хост сервера | `91.x.x.x` |
| `SSH_USER` | пользователь SSH | `root` или `ed` |
| `SSH_PORT` | порт SSH (необязательно, по умолчанию 22) | `22` |
| `SSH_PRIVATE_KEY` | **приватный** ключ (весь файл целиком) | содержимое `~/.ssh/beget_phonetrade` |
| `DEPLOY_PATH` | отдельная папка под приложение | `/home/ed/phonetrade` |

> ⚠️ `DEPLOY_PATH` должен быть **выделенной** папкой — rsync идёт с `--delete`
> и вычищает в ней всё лишнее. Не указывай домашнюю папку или `/var/www` целиком.

Позже (когда подключим Supabase-клиент) добавим:
`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` (нужны на этапе сборки),
а серверный `SUPABASE_SERVICE_ROLE_KEY` — в окружение PM2 на сервере.

## 2. Разовая настройка сервера

```bash
# Node 22 + PM2 (если ещё не стоят)
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt-get install -y nodejs
sudo npm i -g pm2

# Папка под приложение (совпадает с DEPLOY_PATH)
mkdir -p /home/$USER/phonetrade

# Авторизовать деплой-ключ (публичную часть SSH_PRIVATE_KEY) на сервере:
# вставить содержимое beget_phonetrade.pub в ~/.ssh/authorized_keys

# Автостарт PM2 после ребута
pm2 startup    # выполнить выведенную команду
```

## 3. Первый деплой

1. Добавить секреты (п.1) → запустить workflow: вкладка **Actions → Deploy → Run workflow**
   (или сделать любой push в `main`).
2. Проверить, что процесс жив: `pm2 status` → строка `phonetrade` = `online`.
3. Локально проверить: `curl http://127.0.0.1:3000` на сервере.

## 4. nginx + домен

См. `deploy/nginx.conf.example`. Скопировать, заменить `ВАШ_ДОМЕН`,
включить сайт, `nginx -t && systemctl reload nginx`, затем SSL через
`certbot --nginx -d ВАШ_ДОМЕН`.

## Полезное

- Логи приложения: `pm2 logs phonetrade`
- Перезапуск вручную: `pm2 reload phonetrade`
- Откат: GitHub → Actions → перезапустить предыдущий успешный workflow,
  либо `git revert` и push.
