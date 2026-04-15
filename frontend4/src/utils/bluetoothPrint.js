function requestBluetoothPermission() {
  return new Promise((resolve) => {
    if (!window.cordova?.plugins?.permissions) { resolve(true); return }
    const perms = window.cordova.plugins.permissions
    perms.requestPermissions([
      'android.permission.BLUETOOTH_CONNECT',
      'android.permission.BLUETOOTH_SCAN',
      'android.permission.ACCESS_FINE_LOCATION'
    ], () => resolve(true), () => resolve(false))
  })
}

export async function listarDispositivos() {
  return new Promise(async (resolve, reject) => {
    if (!window.bluetoothSerial) { reject('Plugin no disponible'); return }
    await requestBluetoothPermission()
    window.bluetoothSerial.list(
      (devices) => resolve(devices || []),
      (err) => reject('Error: ' + err)
    )
  })
}

export async function imprimirEnDispositivo(address, lineas) {
  return new Promise((resolve, reject) => {
    const texto = lineas.join('\r\n') + '\r\n\r\n\r\n'
    const bytes = new Uint8Array(texto.length)
    for (let i = 0; i < texto.length; i++) {
      bytes[i] = texto.charCodeAt(i) & 0xFF
    }

    const doWrite = () => {
      window.bluetoothSerial.write(
        bytes.buffer,
        () => resolve('OK'),
        (err) => reject('Error al escribir: ' + err)
      )
    }

    const conectar = (intento) => {
      window.bluetoothSerial.connect(
        address,
        () => setTimeout(doWrite, 300),
        (err) => {
          if (intento < 3) {
            setTimeout(() => conectar(intento + 1), 1500)
          } else {
            reject('Error al conectar: ' + err)
          }
        }
      )
    }

    window.bluetoothSerial.isConnected(
      () => doWrite(),
      () => conectar(1)
    )
  })
}

export async function imprimirRaw(address, bytes) {
  return new Promise((resolve, reject) => {
    const doWrite = () => {
      window.bluetoothSerial.write(
        bytes.buffer,
        () => resolve('OK'),
        (err) => reject('Error al escribir: ' + err)
      )
    }
    const conectar = (intento) => {
      window.bluetoothSerial.connect(
        address,
        () => setTimeout(doWrite, 300),
        (err) => {
          if (intento < 3) {
            setTimeout(() => conectar(intento + 1), 1500)
          } else {
            reject('Error al conectar: ' + err)
          }
        }
      )
    }
    window.bluetoothSerial.isConnected(
      () => doWrite(),
      () => conectar(1)
    )
  })
}