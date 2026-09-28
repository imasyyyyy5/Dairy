sed -i '2179i \
function appConfirmDelete(title, body) {\
  return new Promise((resolve) => {\
    confirmResolution = resolve;\
    document.getElementById("mc-title").textContent = title;\
    document.getElementById("mc-body").textContent = body;\
    let timeLeft = 5;\
    const updateBtn = () => {\
      document.getElementById("mc-act").innerHTML = `<button class="btn bp" onclick="submitAppConfirm(false)">Cancel</button><button class="btn bg" disabled>Confirm (${timeLeft}s)</button>`;\
    };\
    updateBtn();\
    om("m-confirm");\
    confirmTimer = setInterval(() => {\
      timeLeft -= 1;\
      if (timeLeft <= 0) {\
        clearInterval(confirmTimer);\
        confirmTimer = null;\
        document.getElementById("mc-act").innerHTML = `<button class="btn bp" onclick="submitAppConfirm(false)">Cancel</button><button class="btn bd" onclick="submitAppConfirm(true)">Confirm</button>`;\
      } else {\
        updateBtn();\
      }\
    }, 1000);\
  });\
}' app.html
