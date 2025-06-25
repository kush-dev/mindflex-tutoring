const startCountdown = (deliveryTime, setTimeRemaining, questionId) => {
  let [value, unit] = deliveryTime.split(' ');
  value = parseInt(value, 10);
  let initialTime = '00:00:00';
  const storageKey = `countdown_${questionId}`;

  // Load saved time if exists
  let [hours, minutes, seconds] = localStorage.getItem(storageKey)
    ? localStorage.getItem(storageKey).split(':').map(Number)
    : initialTime.split(':').map(Number);

  if (!localStorage.getItem(storageKey)) {
    if (unit.toLowerCase().includes('days') || unit.toLowerCase().includes('day') || unit.toLowerCase().includes('d')) {
      if (value === 1) initialTime = '23:59:59';
      else if (value === 2) initialTime = '47:59:59';
      else if (value === 3) initialTime = '71:59:59';
      else if (value === 4) initialTime = '95:59:59';
      else if (value === 5) initialTime = '119:59:59';
      else if (value === 6) initialTime = '143:59:59';
      else if (value === 7) initialTime = '167:59:59';
      else if (value === 8) initialTime = '191:59:59';
      else if (value === 9) initialTime = '215:59:59';
      else if (value === 10) initialTime = '239:59:59';
    } else if (unit.toLowerCase().includes('hrs') || unit.toLowerCase().includes('hours') || unit.toLowerCase().includes('hr')) {
      if (value === 1) initialTime = '00:59:59';
      else if (value === 2) initialTime = '01:59:59';
      else if (value === 3) initialTime = '02:59:59';
      else if (value === 4) initialTime = '03:59:59';
      else if (value === 5) initialTime = '04:59:59';
      else if (value === 6) initialTime = '05:59:59';
      else if (value === 7) initialTime = '06:59:59';
      else if (value === 8) initialTime = '07:59:59';
      else if (value === 9) initialTime = '08:59:59';
      else if (value === 10) initialTime = '09:59:59';
      else if (value === 11) initialTime = '10:59:59';
      else if (value === 12) initialTime = '11:59:59';
      else if (value === 13) initialTime = '12:59:59';
      else if (value === 14) initialTime = '13:59:59';
      else if (value === 15) initialTime = '14:59:59';
      else if (value === 16) initialTime = '15:59:59';
      else if (value === 17) initialTime = '16:59:59';
      else if (value === 18) initialTime = '17:59:59';
      else if (value === 19) initialTime = '18:59:59';
      else if (value === 20) initialTime = '19:59:59';
      else if (value === 21) initialTime = '20:59:59';
      else if (value === 22) initialTime = '21:59:59';
      else if (value === 23) initialTime = '22:59:59';
    }
    [hours, minutes, seconds] = initialTime.split(':').map(Number);
  }

  const updateTimer = () => {
    if (seconds > 0) {
      seconds--;
    } else if (minutes > 0) {
      minutes--;
      seconds = 59;
    } else if (hours > 0) {
      hours--;
      minutes = 59;
      seconds = 59;
    }

    if (hours === 0 && minutes === 0 && seconds === 0) {
      setTimeRemaining('00 hours 00 min 00 sec');
      localStorage.removeItem(storageKey);
      return;
    }

    const timeStr = `${hours.toString().padStart(2, '0')} hours ${minutes.toString().padStart(2, '0')} min ${seconds.toString().padStart(2, '0')} sec`;
    setTimeRemaining(timeStr);
    localStorage.setItem(storageKey, `${hours}:${minutes}:${seconds}`);
  };

  updateTimer(); // Set initial time
  const timer = setInterval(updateTimer, 1000);
  return () => clearInterval(timer);
};

export { startCountdown };