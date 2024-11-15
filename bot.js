require('dotenv').config()

const TelegramBot = require('node-telegram-bot-api')

const token = process.env.BOT_TOKEN
const url = process.env.APP_URL
const bot = new TelegramBot(token, { polling: true })

const locations = {
  'Район Бибирево': {
    latitude: 55.894495,
    longitude: 37.607673,
    places: [
      {
        name: 'Общага',
        latitude: 55.891132,
        longitude: 37.616239,
      },
      {
        name: 'Государственный исторический музей',
        latitude: 55.7557,
        longitude: 37.6173,
      },
      { name: 'Большой театр', latitude: 55.7602, longitude: 37.6173 },
    ],
  },
  ВДНХ: {
    latitude: 55.826398,
    longitude: 37.637875,
    places: [
      {
        name: 'Статуя «Рабочий и колхозница».',
        latitude: 55.828165,
        longitude: 37.64681,
      },
      { name: 'Музей космонавтики', latitude: 55.82271, longitude: 37.639743 },
      {
        name: 'Памятник В.И. Ленину на ВДНХ',
        latitude: 55.82804,
        longitude: 37.634734,
      },
      {
        name: 'Фонтан Дружбы народов',
        latitude: 55.82985,
        longitude: 37.631782,
      },
      {
        name: 'Ротонда, павильон 66',
        latitude: 55.831623,
        longitude: 37.631947,
      },
      {
        name: 'РГСУ',
        latitude: 55.834768,
        longitude: 37.635307,
      },
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

function getDistanceFromLatLonInKm(lat1, lon1, lat2, lon2) {
  const R = 6371
  const dLat = (lat2 - lat1) * (Math.PI / 180)
  const dLon = (lon2 - lon1) * (Math.PI / 180)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) ** 2
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
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
    .catch((error) => console.error('Error sending msg', error))
})

bot.on('message', (msg) => {
  const chatId = msg.chat.id
  if (msg.location) {
    const { latitude, longitude } = msg.location

    let closestLocation = null
    let closestDistance = Infinity

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

    bot
      .sendMessage(
        chatId,
        `Ваша текущая локация:\nШирота: ${latitude}\nДолгота: ${longitude}\nБлижайшая локация: ${closestLocation} (расстояние: ${closestDistance.toFixed(
          2,
        )} км)\nВот маршрут в Яндекс.Картах: ${yandexMapsUrl}`,
      )
      .catch((error) => console.error('Error sending location message', error))

    const placesButtons = locations[closestLocation].places.map(
      (place, index) => {
        return [
          { text: place.name, callback_data: `${closestLocation}:${index}` },
        ]
      },
    )

    const options = {
      reply_markup: {
        inline_keyboard: placesButtons,
      },
    }

    bot
      .sendMessage(
        chatId,
        `Вы сейчас находитесь в районе ${closestLocation}. Выберите подлокацию:`,
        options,
      )
      .catch((error) => console.error('Error sending places message', error))

    bot.userData = {
      chatId: chatId,
      userLocation: { latitude, longitude },
      closestLocation: closestLocation,
    }
  }
})

bot.on('callback_query', (callbackQuery) => {
  const msg = callbackQuery.message
  const [locationName, placeIndex] = callbackQuery.data.split(':')
  const userLocation = bot.userData.userLocation
  const selectedPlace = locations[locationName].places[placeIndex]

  if (selectedPlace) {
    const distanceToPlace = getDistanceFromLatLonInKm(
      userLocation.latitude,
      userLocation.longitude,
      selectedPlace.latitude,
      selectedPlace.longitude,
    )

    let responseText =
      distanceToPlace < 0.05
        ? 'Вы на месте!'
        : `Вы находитесь в ${distanceToPlace.toFixed(2)} км от ${
            selectedPlace.name
          }.`

    bot
      .sendMessage(bot.userData.chatId, responseText)
      .catch((error) => console.error('Error sending distance message', error))
  }
  bot.answerCallbackQuery(callbackQuery.id)
})

bot.on('polling_error', (error) => console.error('Polling error', error))
