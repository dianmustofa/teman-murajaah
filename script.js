document.addEventListener("DOMContentLoaded", function () {
  const surahDropdown = document.getElementById("surah");
  const startAyatInput = document.getElementById("startAyat");
  const endAyatInput = document.getElementById("endAyat");
  const getAyatButton = document.getElementById("getAyat");
  const ayatTextElement = document.getElementById("ayatText");
  const startVoiceButton = document.getElementById("startVoice");
  const userVoiceElement = document.getElementById("userVoice");
  const accuracyElement = document.getElementById("accuracy");

  let targetAyatText = ""; // Ayat yang akan dibandingkan

  // Fetch the list of Surahs from the Quran API
  fetch("https://api.alquran.cloud/v1/surah")
    .then((response) => response.json())
    .then((data) => {
      const surahs = data.data;
      surahs.forEach((surah) => {
        const option = document.createElement("option");
        option.value = surah.number;
        option.textContent = `${surah.number}. ${surah.englishName} (${surah.englishNameTranslation})`;
        surahDropdown.appendChild(option);
      });
    })
    .catch((error) => console.error("Error fetching surahs:", error));

  // Fetch the ayat based on user selection
  getAyatButton.addEventListener("click", () => {
    const surahNumber = surahDropdown.value;
    const startAyat = parseInt(startAyatInput.value, 10);
    const endAyat = parseInt(endAyatInput.value, 10);

    if (!surahNumber || !startAyat || !endAyat || startAyat > endAyat) {
      alert("Silakan pilih surah dan masukkan nomor ayat dengan benar!");
      return;
    }

    targetAyatText = ""; // Reset target text

    const fetchPromises = [];
    for (let i = startAyat; i <= endAyat; i++) {
      fetchPromises.push(
        fetch(
          `https://api.alquran.cloud/v1/ayah/${surahNumber}:${i}/editions/quran-uthmani`
        ).then((response) => response.json())
      );
    }

    Promise.all(fetchPromises)
      .then((responses) => {
        responses.forEach((data) => {
          const ayatData = data.data[0]; // Get the first edition (Uthmani)
          targetAyatText += ayatData.text + " "; // Append ayat text
        });
        ayatTextElement.textContent = targetAyatText.trim();
      })
      .catch((error) => {
        console.error("Error fetching ayat:", error);
        ayatTextElement.textContent =
          "Ayat tidak ditemukan. Silakan coba lagi.";
      });
  });

  // Voice recognition logic
  const recognition = new (window.SpeechRecognition ||
    window.webkitSpeechRecognition)();
  recognition.lang = "ar-SA"; // Set language to Arabic
  recognition.interimResults = false;

  startVoiceButton.addEventListener("click", () => {
    if (!targetAyatText) {
      alert("Silakan pilih dan tampilkan ayat terlebih dahulu!");
      return;
    }

    recognition.start();
    startVoiceButton.textContent = "Mendengarkan...";
  });

  recognition.onresult = (event) => {
    const transcript = event.results[0][0].transcript;
    userVoiceElement.textContent = transcript;

    // Calculate similarity
    const similarity = calculateSimilarity(targetAyatText, transcript);
    accuracyElement.textContent = `Akurasi: ${similarity.toFixed(2)}%`;

    startVoiceButton.textContent = "Mulai Bacaan";

    const highlighted = highlightComparison(targetAyatText, transcript);
    document.getElementById("highlightResult").innerHTML = highlighted;
  };

  recognition.onerror = (event) => {
    console.error("Recognition error:", event.error);
    startVoiceButton.textContent = "Mulai Bacaan";
  };

  recognition.onend = () => {
    startVoiceButton.textContent = "Mulai Bacaan";
  };

  // Function to calculate similarity (optimized for multi-line texts)
  // function calculateSimilarity(text1, text2) {
  //   const cleanText1 = text1.replace(/[\s,،.؟]/g, "").toLowerCase();
  //   const cleanText2 = text2.replace(/[\s,،.؟]/g, "").toLowerCase();

  //   let matchCount = 0;
  //   for (let i = 0; i < Math.min(cleanText1.length, cleanText2.length); i++) {
  //     if (cleanText1[i] === cleanText2[i]) {
  //       matchCount++;
  //     }
  //   }

  //   return (matchCount / cleanText1.length) * 100;
  // }

  function calculateSimilarity(text1, text2) {
    const cleanText1 = removeHarakat(text1)
      .replace(/[\s,،.؟]/g, "")
      .toLowerCase();
    const cleanText2 = text2.replace(/[\s,،.؟]/g, "").toLowerCase();

    let matchCount = 0;
    for (let i = 0; i < Math.min(cleanText1.length, cleanText2.length); i++) {
      if (cleanText1[i] === cleanText2[i]) {
        matchCount++;
      }
    }

    return (matchCount / cleanText1.length) * 100;
  }

  function removeHarakat(text) {
    return text.replace(/[\u064B-\u0652]/g, ""); // Menghapus harakat seperti fathah, kasrah, dhammah, sukun, dll.
  }

  function highlightComparison(target, result) {
    const cleanTarget = removeHarakat(target).replace(/[\s,،.؟]/g, "");
    const cleanResult = result.replace(/[\s,،.؟]/g, "");

    let outputHTML = "";

    for (let i = 0; i < cleanTarget.length; i++) {
      const charTarget = cleanTarget[i];
      const charResult = cleanResult[i];

      if (charResult === undefined) {
        // Belum terbaca
        outputHTML += `<span style="color: gray;">${charTarget}</span>`;
      } else if (charResult === charTarget) {
        // Benar
        outputHTML += `<span style="color: green;">${charTarget}</span>`;
      } else {
        // Salah
        outputHTML += `<span style="color: red;">${charTarget}</span>`;
      }
    }

    return outputHTML;
  }
});
