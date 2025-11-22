# Валидатор JSON-схем

Это проект Vibecoding only для проверки и визуализации JSON-схем.

## Особенности

- Валидация JSON-схем с помощью AJV (Another JSON Schema Validator)
- Генерация форм на основе JSON-схем
- Обнаружение рекурсии в схемах
- Подсветка строк с рекурсией в редакторе
- Выбор из примеров схем для тестирования

## Начало работы

1. Клонируйте репозиторий
2. Установите зависимости:
   ```
   npm install
   ```
3. Запустите сервер разработки:
   ```
   npm run dev
   ```
4. Откройте браузер по адресу http://localhost:5173

## Сборка для продакшена

Для создания продакшен-сборки:
```
npm run build
```

Для предварительного просмотра продакшен-сборки:
```
npm run preview
```

## Деплой

### GitHub Pages
Для публикации на GitHub Pages:
```
npm run deploy
```

### Surge
Для публикации на Surge:
```
npm run build
surge dist/ json-form-checker.surge.sh
```

## Зависимости

- React + TypeScript + Vite
- Material UI (UI Components)
- AJV (JSON Schema Validator)
- Monaco Editor (Редактор кода)
- React JSON Schema Form (Генерация форм)