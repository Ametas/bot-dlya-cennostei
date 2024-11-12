const locationss = {
  'Район Бибирево': {
    latitude: 55.894495,
    longitude: 37.607673,
    places: [
      { name: 'Общага', latitude: 55.891132, longitude: 37.616239 },
      {
        name: 'Государственный исторический музей',
        latitude: 55.7557,
        longitude: 37.6173,
      },
      { name: 'Большой театр', latitude: 55.7602, longitude: 37.6173 },
    ],
  },
  'Локация 2': {
    latitude: 59.9343,
    longitude: 30.3351,
    places: [
      { name: 'Эрмитаж', latitude: 59.9398, longitude: 30.3158 },
      { name: 'Невский проспект', latitude: 59.9343, longitude: 30.3351 },
      { name: 'Крепость Орешек', latitude: 59.8781, longitude: 29.7633 },
    ],
  },
  'Локация 3': {
    latitude: 54.7381,
    longitude: 55.9939,
    places: [
      {
        name: 'Национальный музей Республики Башкортостан',
        latitude: 54.7381,
        longitude: 55.9939,
      },
      { name: 'Парк Победы', latitude: 54.735, longitude: 55.991 },
      { name: 'Уфимский кремль', latitude: 54.735, longitude: 55.965 },
    ],
  },
}

require('dotenv').config()

const TelegramBot = require('node-telegram-bot-api')

const token = process.env.BOT_TOKEN
const url = process.env.APP_URL
const bot = new TelegramBot(token, { polling: true })

// Словарь с локациями и их координатами
const locations = {
  'Район Бибирево': {
    latitude: 55.894495,
    longitude: 37.607673,
    places: [
      { name: 'Общага', latitude: 55.891132, longitude: 37.616239 },
      {
        name: 'Государственный исторический музей',
        latitude: 55.7557,
        longitude: 37.6173,
      },
      { name: 'Большой театр', latitude: 55.7602, longitude: 37.6173 },
    ],
  },
  'Локация 2': {
    latitude: 59.9343,
    longitude: 30.3351,
    places: [
      { name: 'Эрмитаж', latitude: 59.9398, longitude: 30.3158 },
      { name: 'Невский проспект', latitude: 59.9343, longitude: 30.3351 },
      { name: 'Крепость Орешек', latitude: 59.8781, longitude: 29.7633 },
    ],
  },
  'Локация 3': {
    latitude: 54.7381,
    longitude: 55.9939,
    places: [
      {
        name: 'Национальный музей Республики Башкортостан',
        latitude: 54.7381,
        longitude: 55.9939,
      },
      { name: 'Парк Победы', latitude: 54.735, longitude: 55.991 },
      { name: 'Уфимский кремль', latitude: 54.735, longitude: 55.965 },
    ],
  },
}

// Функция для вычисления расстояния между двумя точками
function getDistanceFromLatLonInKm(lat1, lon1, lat2, lon2) {
  const R = 6371 // Радиус Земли в километрах
  const dLat = (lat2 - lat1) * (Math.PI / 180)
  const dLon = (lon2 - lon1) * (Math.PI / 180)
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c // Расстояние в километрах
}

bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id

  const options = {
    reply_markup: {
      keyboard: [
        [{ text: 'Получить текущую локацию', request_location: true }],
      ],
      resize_keyboard: true,
      one_time_keyboard: true,
    },
  }

  bot
    .sendMessage(
      chatId,
      'Нажмите кнопку, чтобы отправить свою текущую локацию:',
      options,
    )
    .catch((error) => {
      console.error('Error sending msg', error)
    })
})

// Обработка выбора локации
bot.on('message', (msg) => {
  const chatId = msg.chat.id

  // Проверка, отправлена ли геолокация
  if (msg.location) {
    const { latitude, longitude } = msg.location

    let closestLocation = null
    let closestDistance = Infinity

    // Находим ближайшую локацию
    for (const [locationName, coords] of Object.entries(locations)) {
      const distance = getDistanceFromLatLonInKm(
        latitude,
        longitude,
        coords.latitude,
        coords.longitude,
      )
      if (distance < closestDistance) {
        closestDistance = distance
        closestLocation = locationName
      }
    }

    const yandexMapsUrl = `https://yandex.ru/maps/?ll=${longitude},${latitude}&z=12&mode=routes&pt=${longitude},${latitude}`

    // Отправляем пользователю информацию о ближайшей локации
    bot
      .sendMessage(
        chatId,
        `Ваша текущая локация:\nШирота: ${latitude}\nДолгота: ${longitude}\nБлижайшая локация: ${closestLocation} (расстояние: ${closestDistance.toFixed(
          2,
        )} км)\nВот маршрут в Яндекс.Картах: ${yandexMapsUrl}`,
      )
      .catch((error) => {
        console.error('Error sending location message', error)
      })

    // Создаем кнопки для подлокаций
    const placesButtons = locations[closestLocation].places.map((place) => {
      return [{ text: place.name, callback_data: place.name }]
    })

    const options = {
      reply_markup: {
        inline_keyboard: placesButtons,
      },
    }

    bot.sendMessage(chatId, 'Выберите подлокацию:', options).catch((error) => {
      console.error('Error sending places message', error)
    })

    // Сохраняем информацию о текущем пользователе
    bot.userData = {
      chatId: chatId,
      userLocation: { latitude, longitude },
      closestLocation: closestLocation,
    }

    return // Завершаем обработку, если была отправлена локация
  }

  // Обработка нажатия на кнопку подлокации
  if (msg.data) {
    const selectedPlaceName = msg.data
    const userLocation = bot.userData.userLocation
    const closestLocation = bot.userData.closestLocation

    const selectedPlace = locations[closestLocation].places.find(
      (place) => place.name === selectedPlaceName,
    )

    if (selectedPlace) {
      const distanceToPlace = getDistanceFromLatLonInKm(
        userLocation.latitude,
        userLocation.longitude,
        selectedPlace.latitude,
        selectedPlace.longitude,
      )

      if (distanceToPlace < 0.05) {
        // 50 метров
        bot.sendMessage(userLocation.chatId, 'Вы на месте!').catch((error) => {
          console.error('Error sending you are here message', error)
        })
      } else {
        bot
          .sendMessage(
            userLocation.chatId,
            'Вы не находитесь в радиусе 50 метров от этого места.',
          )
          .catch((error) => {
            console.error('Error sending not near message', error)
          })
      }
    }

    return // Завершаем обработку нажатия на кнопку
  }

  bot
    .sendMessage(chatId, 'Пожалуйста, отправьте свою текущую локацию.')
    .catch((error) => {
      console.error('Error sending invalid location message', error)
    })
})

bot.on('polling_error', (error) => {
  console.error('Polling error', error)
})
