/* ============================================================
   SAVE THE DATE
   JOVANNIE & SHENALYN
   APP.JS
   ============================================================ */

const d = SAVE_THE_DATE;

let scene = 0;
let guest = null;
let response = null;
let estimate = null;
let surveyStatus = null;
let surveyStatusCheckedAt = 0;
let surveyStatusRequest = null;
const SURVEY_STATUS_CACHE_MS = 10000;

/*
 * Navigation history stores the actual scenes visited.
 * This is intentionally separate from the scene number so
 * branching scenes (Yes / No / Not sure) can always go back
 * to the scene the guest actually came from.
 */
const sceneHistory = [];


/* ============================================================
   SCENES
   ============================================================ */

const scenes = [
  ...document.querySelectorAll(".scene")
];

const dots =
  document.querySelector(".dots");


/* ============================================================
   PROGRESS DOTS
   ============================================================ */

if (dots) {

  dots.innerHTML = scenes
    .map(
      (_, i) =>
        `<button
          class="dot ${i === 0 ? "active" : ""}"
          data-i="${i}"
          aria-label="Scene ${i + 1}"
          tabindex="-1"
          type="button"
        ></button>`
    )
    .join("");

}


/* ============================================================
   DATA BINDINGS
   ============================================================ */

const bind = {
  title: d.survey.title,
  groom: d.couple.groom,
  bride: d.couple.bride,
  date: d.wedding.date,
  message: d.survey.message,
  unsure: d.survey.unsure,
  formalNote: d.survey.formalNote,
  deadline: d.survey.deadline,
  hashtag: d.survey.hashtag
};


document
  .querySelectorAll("[data-bind]")
  .forEach(element => {

    const key =
      element.dataset.bind;

    if (
      Object.prototype.hasOwnProperty.call(
        bind,
        key
      )
    ) {

      element.textContent =
        bind[key];

    }

  });


/* ============================================================
   THEME
   ============================================================ */

Object
  .entries(d.theme || {})
  .forEach(
    ([key, value]) => {

      document.documentElement.style.setProperty(
        "--" +
        key.replace(
          /[A-Z]/g,
          match =>
            "-" +
            match.toLowerCase()
        ),
        value
      );

    }
  );


/* ============================================================
   CHECK GOOGLE APPS SCRIPT STATUS
   ============================================================ */

async function checkSurveyStatus(force = false) {

  /*
   * Google Apps Script is the authority.
   *
   * There is NO local bypass.
   *
   * If the Apps Script URL is missing,
   * the survey is CLOSED.
   */

  /*
   * Keep the server authoritative, but avoid making the same
   * status request repeatedly during normal navigation.
   * A short client cache removes most of the perceived lag
   * caused by repeated Google Apps Script calls.
   */
  const now = Date.now();

  if (
    !force &&
    surveyStatus &&
    now - surveyStatusCheckedAt < SURVEY_STATUS_CACHE_MS
  ) {

    return surveyStatus;

  }

  if (surveyStatusRequest) {

    return surveyStatusRequest;

  }

  if (
    !d.googleScriptUrl ||
    !String(d.googleScriptUrl).trim()
  ) {

    surveyStatus = {

      enabled: false,

      message:
        "Save the Date is not currently available."

    };

    surveyStatusCheckedAt = Date.now();

    return surveyStatus;

  }


  surveyStatusRequest = (async () => {

  try {

    const baseUrl =
      String(
        d.googleScriptUrl
      ).trim();


    const separator =
      baseUrl.includes("?")
        ? "&"
        : "?";


    const url =
      `${baseUrl}` +
      `${separator}action=status` +
      `&_=${Date.now()}`;


    const request =
      await fetch(
        url,
        {
          method: "GET",
          cache: "no-store"
        }
      );


    if (!request.ok) {

      throw new Error(
        `Status request failed: ${request.status}`
      );

    }


    const text =
      await request.text();


    console.log(
      "SAVE THE DATE STATUS:",
      text
    );


    let result;

    try {

      result =
        JSON.parse(text);

    }

    catch (error) {

      throw new Error(
        "Google Apps Script returned invalid JSON."
      );

    }


    /*
     * IMPORTANT:
     *
     * Only literal boolean TRUE is accepted.
     *
     * "true"
     * "TRUE"
     * 1
     *
     * are NOT accepted here.
     *
     * The server must return:
     *
     * enabled: true
     *
     * to open the survey.
     */

    surveyStatus = {

      ...result,

      enabled:
        result.enabled === true

    };

    surveyStatusCheckedAt = Date.now();

    return surveyStatus;

  }

  catch (error) {

    console.error(
      "Save the Date status error:",
      error
    );


    surveyStatus = {

      enabled: false,

      message:
        "We couldn't check the Save the Date status right now. Please try again."

    };

    surveyStatusCheckedAt = Date.now();

    return surveyStatus;

  }

  })();

  try {
    return await surveyStatusRequest;
  } finally {
    surveyStatusRequest = null;
  }

}


/* ============================================================
   HARD RESET RSVP STATE
   ============================================================ */

function clearRSVPState() {

  guest =
    null;

  response =
    null;

  estimate =
    null;

}


/* ============================================================
   FORCE CODE SCENE
   ============================================================ */

function forceCodeScene(messageText) {

  clearRSVPState();
  sceneHistory.length = 0;


  const codeMsg =
    document.getElementById(
      "codeMsg"
    );


  if (codeMsg) {

    codeMsg.textContent =
      messageText ||
      "The Save the Date response period is currently closed.";

  }


  /*
   * Remove active state from every scene.
   */

  scenes.forEach(
    currentScene => {

      currentScene
        .classList
        .remove("active");

    }
  );


  /*
   * Scene 3 is the code scene.
   */

  if (scenes[3]) {

    scenes[3]
      .classList
      .add("active");

    scene =
      3;

  }


  updateDots();

}


/* ============================================================
   ENSURE SAVE THE DATE IS OPEN
   ============================================================ */

async function ensureSurveyOpen(force = false) {

  const status =
    await checkSurveyStatus(force);


  /*
   * NEVER trust anything except:
   *
   * status.enabled === true
   */

  if (
    !status ||
    status.enabled !== true
  ) {

    forceCodeScene(
      status?.message ||
      "The Save the Date response period is currently closed."
    );


    return false;

  }


  return true;

}


/* ============================================================
   SCENE CONTROL — HARD LOCK
   ============================================================ */

async function show(nextScene, options = {}) {

  /*
   * ----------------------------------------------------------
   * BASIC RANGE CHECK
   * ----------------------------------------------------------
   */

  if (
    nextScene < 0 ||
    nextScene >= scenes.length
  ) {

    return false;

  }


  /*
   * ----------------------------------------------------------
   * HARD SAVE THE DATE LOCK
   * ----------------------------------------------------------
   *
   * Scenes 0–3 are public.
   *
   * Scenes 4–9 require:
   *
   * 1. Google Apps Script exists
   * 2. Google Sheet says enabled === true
   * 3. A verified guest exists
   *
   * This is deliberately inside show().
   *
   * Therefore this cannot be bypassed by:
   *
   * show(4)
   * show(5)
   * show(6)
   * show(7)
   * show(8)
   * show(9)
   *
   * ----------------------------------------------------------
   */

  if (
    nextScene >= 4
  ) {

    /*
     * ALWAYS check the server.
     */

    const status =
      await checkSurveyStatus();


    /*
     * The ONLY valid open response is:
     *
     * enabled === true
     */

    if (
      !status ||
      status.enabled !== true
    ) {

      forceCodeScene(
        status?.message ||
        "The Save the Date response period is currently closed."
      );


      return false;

    }


    /*
     * Server says OPEN.
     *
     * Now require a verified guest.
     */

    if (!guest) {

      forceCodeScene(
        "Please enter your valid Save the Date code first."
      );


      return false;

    }

  }


  /*
   * ----------------------------------------------------------
   * CHANGE SCENE
   * ----------------------------------------------------------
   */

  const previous = scene;

  scenes[previous]
    ?.classList
    .remove("active");


  scenes[nextScene]
    ?.classList
    .add("active");


  scene =
    nextScene;


  /*
   * Record only real forward/branch navigation.
   * Back navigation calls show(..., { fromHistory: true })
   * so it does not create a second history entry.
   */
  if (options.fromHistory !== true && previous !== nextScene) {

    sceneHistory.push(previous);

  }


  updateDots();


  return true;

}


/* ============================================================
   UPDATE DOTS
   ============================================================ */

function updateDots() {

  document
    .querySelectorAll(".dot")
    .forEach(
      (dot, index) => {

        dot.classList.toggle(
          "active",
          index === scene
        );

      }
    );

}


/* ============================================================
   CONTROLLED FORWARD NAVIGATION
   ============================================================ */

async function nextScene() {

  /*
   * Scene 3 = CODE
   *
   * The guest must be verified before
   * Scene 4 can open.
   */

  if (
    scene === 3
  ) {

    const open =
      await ensureSurveyOpen();


    if (!open) {

      return;

    }


    if (!guest) {

      const message =
        document.getElementById(
          "codeMsg"
        );


      if (message) {

        message.textContent =
          "Please enter your valid Save the Date code first.";

      }


      return;

    }

  }


  /*
   * Scene 5 = ATTENDANCE
   */

  if (
    scene === 5
  ) {

    const open =
      await ensureSurveyOpen();


    if (!open) {

      return;

    }


    if (!guest) {

      forceCodeScene(
        "Please enter your valid Save the Date code first."
      );


      return;

    }


    if (!response) {

      return;

    }

  }


  /*
   * Scene 6 = ESTIMATE
   */

  if (
    scene === 6 &&
    response === "yes" &&
    !estimate
  ) {

    return;

  }


  /*
   * IMPORTANT:
   *
   * show() is itself protected.
   */

  await show(
    scene + 1
  );

}


/* ============================================================
   BACK NAVIGATION
   ============================================================ */

function previousScene() {

  if (scene <= 0) {

    return;

  }


  /*
   * Scene 9 is the submitted response screen.
   * Keep the existing final-response lock.
   */
  if (scene === 9) {

    return;

  }


  const previous =
    sceneHistory.pop();


  if (typeof previous !== "number") {

    return;

  }


  /*
   * If the guest backs out of a response branch, return to
   * the actual attendance scene rather than simply doing
   * scene - 1. This fixes: 5 -> 8 -> Back = 5 and
   * 5 -> 7 -> Back = 5.
   */
  if (scene === 7 || scene === 8) {

    response = null;
    estimate = null;

  }


  show(previous, { fromHistory: true });

}



/* ============================================================
   NORMAL CONTINUE BUTTONS
   ============================================================ */

document
  .querySelectorAll("[data-next]")
  .forEach(
    button => {

      button.onclick =
        async () => {

          await nextScene();

        };

    }
  );


/* ============================================================
   COUNTDOWN
   ============================================================ */

function countdown(
  target,
  prefix
) {

  if (!target) {

    return;

  }


  let milliseconds =
    new Date(target) -
    Date.now();


  if (
    !Number.isFinite(milliseconds)
  ) {

    return;

  }


  if (
    milliseconds < 0
  ) {

    milliseconds = 0;

  }


  const values = {

    days:
      Math.floor(
        milliseconds /
        864e5
      ),

    hours:
      Math.floor(
        milliseconds %
        864e5 /
        36e5
      ),

    minutes:
      Math.floor(
        milliseconds %
        36e5 /
        6e4
      ),

    seconds:
      Math.floor(
        milliseconds %
        6e4 /
        1e3
      )

  };


  Object
    .entries(values)
    .forEach(
      ([key, value]) => {

        const element =
          document.querySelector(
            `[data-${prefix}="${key}"]`
          );


        if (element) {

          element.textContent =
            String(value)
              .padStart(
                2,
                "0"
              );

        }

      }
    );

}


/* ============================================================
   WEDDING COUNTDOWN
   ============================================================ */

countdown(
  d.wedding.dateTime,
  "main"
);


setInterval(
  () => {

    countdown(
      d.wedding.dateTime,
      "main"
    );

  },
  1000
);


/* ============================================================
   SAVE THE DATE DEADLINE COUNTDOWN
   ============================================================ */

countdown(
  d.survey.deadlineTime,
  "dead"
);


setInterval(
  () => {

    countdown(
      d.survey.deadlineTime,
      "dead"
    );

  },
  1000
);


/* ============================================================
   VERIFY GUEST
   ============================================================ */

async function verify(code) {

  /*
   * ----------------------------------------------------------
   * FIRST:
   * Check the server.
   * ----------------------------------------------------------
   */

  const open =
    await ensureSurveyOpen();


  if (!open) {

    return {

      success: false,

      closed: true,

      message:
        surveyStatus?.message ||
        "The Save the Date response period is currently closed."

    };

  }


  /*
   * No Apps Script = CLOSED.
   */

  if (
    !d.googleScriptUrl ||
    !String(d.googleScriptUrl).trim()
  ) {

    return {

      success: false,

      closed: true,

      message:
        "Google Apps Script is not connected."

    };

  }


  try {

    const baseUrl =
      String(
        d.googleScriptUrl
      ).trim();


    const separator =
      baseUrl.includes("?")
        ? "&"
        : "?";


    const url =
      `${baseUrl}` +
      `${separator}action=verify` +
      `&code=${encodeURIComponent(code)}` +
      `&_=${Date.now()}`;


    const request =
      await fetch(
        url,
        {
          method: "GET",
          cache: "no-store"
        }
      );


    if (!request.ok) {

      throw new Error(
        `Verification request failed: ${request.status}`
      );

    }


    const text =
      await request.text();


    console.log(
      "SAVE THE DATE VERIFICATION:",
      text
    );


    let result;

    try {

      result =
        JSON.parse(text);

    }

    catch (error) {

      throw new Error(
        "Invalid verification response."
      );

    }


    /*
     * Server is authoritative.
     */

    if (
      result.success !== true
    ) {

      return result;

    }


    /*
     * Make sure a guest object actually exists.
     */

    if (
      !result.guest
    ) {

      return {

        success: false,

        message:
          "Guest verification returned incomplete information."

      };

    }


    return result;

  }

  catch (error) {

    console.error(
      "Save the Date verification error:",
      error
    );


    return {

      success: false,

      message:
        "We couldn't connect right now. Please try again."

    };

  }

}


/* ============================================================
   SUBMIT RESPONSE
   ============================================================ */

async function submit(payload) {

  /*
   * finish() already performs the final forced status check.
   * Do not make the same Google Apps Script request twice.
   * The Apps Script submit endpoint must still validate the
   * response server-side before writing to the sheet.
   */


  /*
   * No Apps Script = no submission.
   */

  if (
    !d.googleScriptUrl ||
    !String(d.googleScriptUrl).trim()
  ) {

    return {

      success: false,

      closed: true,

      message:
        "Google Apps Script is not connected."

    };

  }


  try {

    const formData =
      new URLSearchParams();


    Object
      .entries(payload)
      .forEach(
        ([key, value]) => {

          formData.append(
            key,
            value ?? ""
          );

        }
      );


    const request =
      await fetch(
        d.googleScriptUrl,
        {
          method: "POST",
          body: formData,
          cache: "no-store"
        }
      );


    if (!request.ok) {

      throw new Error(
        `Submission request failed: ${request.status}`
      );

    }


    const text =
      await request.text();


    console.log(
      "SAVE THE DATE SUBMISSION:",
      text
    );


    let result;

    try {

      result =
        JSON.parse(text);

    }

    catch (error) {

      return {

        success: false,

        message:
          "The server returned an unexpected response. Please try again."

      };

    }


    /*
     * Server is the final authority.
     */

    return result;

  }

  catch (error) {

    console.error(
      "Save the Date submission error:",
      error
    );


    return {

      success: false,

      message:
        "We couldn't submit your response. Please try again."

    };

  }

}


/* ============================================================
   CODE FORM
   ============================================================ */

const codeForm =
  document.getElementById(
    "codeForm"
  );


if (codeForm) {

  codeForm.onsubmit =
    async event => {

      event.preventDefault();


      const codeInput =
        document.getElementById(
          "code"
        );


      const message =
        document.getElementById(
          "codeMsg"
        );


      const code =
        codeInput
          ?.value
          ?.trim()
          ?.toUpperCase() ||
        "";


      if (!code) {

        if (message) {

          message.textContent =
            "Please enter your Save the Date code.";

        }


        return;

      }


      if (message) {

        message.textContent =
          "Checking…";

      }


      /*
       * Verify code.
       *
       * verify() checks the server status FIRST.
       */

      const result =
        await verify(code);


      /*
       * --------------------------------------------------------
       * FAILED VERIFICATION
       * --------------------------------------------------------
       */

      if (
        result.success !== true
      ) {

        clearRSVPState();


        if (message) {

          message.textContent =
            result.message ||
            "The Save the Date response period is currently closed.";

        }


        /*
         * IMPORTANT:
         *
         * Do NOT call show(4).
         */

        return;

      }


      /*
       * --------------------------------------------------------
       * SUCCESSFUL VERIFICATION
       * --------------------------------------------------------
       */

      guest =
        result.guest;


      /*
       * Make absolutely sure the guest is valid.
       */

      if (
        !guest ||
        !guest.id ||
        !guest.code
      ) {

        clearRSVPState();


        if (message) {

          message.textContent =
            "Guest verification failed. Please try again.";

        }


        return;

      }


      const welcome =
        document.getElementById(
          "welcome"
        );


      if (welcome) {

        welcome.textContent =
          `Welcome, ${guest.name}!`;

      }


      const seats =
        document.getElementById(
          "seats"
        );


      if (seats) {

        seats.textContent =
          guest.totalSeats;

      }


      const seatPlural =
        document.getElementById(
          "seatPlural"
        );


      if (seatPlural) {

        seatPlural.textContent =
          guest.totalSeats === 1
            ? ""
            : "s";

      }


      if (message) {

        message.textContent =
          "";

      }


      /*
       * ONLY a successful verification
       * can attempt to open Scene 4.
       *
       * show() performs another server check.
       */

      await show(4);

    };

}


/* ============================================================
   RESPONSE BUTTONS
   ============================================================ */

document
  .querySelectorAll(
    "[data-response]"
  )
  .forEach(
    button => {

      button.onclick =
        async () => {

          /*
           * Server check BEFORE accepting response.
           */

          const open =
            await ensureSurveyOpen();


          if (!open) {

            return;

          }


          /*
           * Guest must still exist.
           */

          if (!guest) {

            forceCodeScene(
              "Please enter your valid Save the Date code first."
            );


            return;

          }


          response =
            button.dataset.response;


          /*
           * ----------------------------------------------------
           * YES
           * ----------------------------------------------------
           */

          if (
            response === "yes"
          ) {

            const picker =
              document.getElementById(
                "picker"
              );


            if (!picker) {

              return;

            }


            picker.innerHTML =
              "";


            for (
              let i = 1;
              i <= guest.totalSeats;
              i++
            ) {

              const numberButton =
                document.createElement(
                  "button"
                );


              numberButton.type =
                "button";


              numberButton.className =
                "number";


              numberButton.textContent =
                i;


              numberButton.onclick =
                () => {

                  estimate =
                    i;


                  document
                    .querySelectorAll(
                      ".number"
                    )
                    .forEach(
                      number =>
                        number.classList
                          .remove(
                            "selected"
                          )
                    );


                  numberButton
                    .classList
                    .add(
                      "selected"
                    );

                };


              picker.appendChild(
                numberButton
              );

            }


            /*
             * Default estimate = 1
             */

            estimate =
              1;


            picker
              .firstElementChild
              ?.classList
              .add(
                "selected"
              );


            await show(6);

            return;

          }


          /*
           * ----------------------------------------------------
           * NO
           * ----------------------------------------------------
           */

          if (
            response === "no"
          ) {

            await show(8);

            return;

          }


          /*
           * ----------------------------------------------------
           * NOT SURE
           * ----------------------------------------------------
           */

          if (
            response === "unsure"
          ) {

            await show(7);

            return;

          }

        };

    }
  );


/* ============================================================
   FINISH / SUBMIT
   ============================================================ */

async function finish() {

  /*
   * Guest must exist.
   */

  if (!guest) {

    forceCodeScene(
      "Please enter your valid Save the Date code first."
    );


    return;

  }


  /*
   * FINAL server status check.
   * Force a fresh server check immediately before submission.
   */

  const open =
    await ensureSurveyOpen(true);


  if (!open) {

    return;

  }


  /*
   * Response must exist.
   */

  if (!response) {

    await show(5);

    return;

  }


  /*
   * YES requires estimate.
   */

  if (
    response === "yes" &&
    !estimate
  ) {

    await show(6);

    return;

  }


  /*
   * Disable confirmation buttons.
   */

  const buttons =
    document.querySelectorAll(
      "#yesConfirm, #unsureConfirm, #noConfirm"
    );


  buttons.forEach(
    button => {

      button.disabled =
        true;

    }
  );


  /*
   * Submission payload.
   */

  const payload = {

    action:
      "submit",

    guestId:
      guest.id,

    code:
      guest.code,

    attendance:
      response,

    estimatedAttending:
      response === "yes"
        ? estimate
        : 0,

    submittedAt:
      new Date().toISOString()

  };


  /*
   * Send response.
   */

  const result =
    await submit(payload);


  /*
   * ----------------------------------------------------------
   * SUBMISSION FAILED
   * ----------------------------------------------------------
   */

  if (
    result.success !== true
  ) {

    buttons.forEach(
      button => {

        button.disabled =
          false;

      }
    );


    alert(
      result.message ||
      "The response could not be submitted."
    );


    /*
     * If the response period closed,
     * clear everything and return to Scene 3.
     */

    if (
      result.closed === true ||
      (
        surveyStatus &&
        surveyStatus.enabled !== true
      )
    ) {

      forceCodeScene(
        result.message ||
        "The Save the Date response period is currently closed."
      );

    }


    return;

  }


  /*
   * ----------------------------------------------------------
   * SUBMISSION SUCCEEDED
   * ----------------------------------------------------------
   */

  const resultTitle =
    document.getElementById(
      "resultTitle"
    );


  const resultText =
    document.getElementById(
      "resultText"
    );


  if (
    response === "yes"
  ) {

    if (resultTitle) {

      resultTitle.textContent =
        "Wonderful! ❤️";

    }


    if (resultText) {

      resultText.textContent =
        `We've received your preliminary estimate of ` +
        `${estimate} attendee` +
        `${estimate === 1 ? "" : "s"}.`;

    }

  }


  else if (
    response === "unsure"
  ) {

    if (resultTitle) {

      resultTitle.textContent =
        "We've recorded your response.";

    }


    if (resultText) {

      resultText.textContent =
        "For now, your response will be considered " +
        "for planning purposes only. " +
        "If your plans change, please contact us immediately.";

    }

  }


  else {

    if (resultTitle) {

      resultTitle.textContent =
        "Thank you for letting us know.";

    }


    if (resultText) {

      resultText.textContent =
        "Your response has been recorded and will " +
        "help us plan ahead.";

    }

  }


  /*
   * Mark guest session as completed.
   *
   * Keep the response page visible.
   */

  await show(9);

}


/* ============================================================
   YES — CONFIRM ESTIMATE
   ============================================================ */

const yesConfirm =
  document.getElementById(
    "yesConfirm"
  );


if (yesConfirm) {

  yesConfirm.onclick =
    async () => {

      if (!estimate) {

        alert(
          "Please choose an estimated number of attendees."
        );


        return;

      }


      await finish();

    };

}


/* ============================================================
   NOT SURE — CONFIRM
   ============================================================ */

const unsureConfirm =
  document.getElementById(
    "unsureConfirm"
  );


if (unsureConfirm) {

  unsureConfirm.onclick =
    async () => {

      response =
        "unsure";


      await finish();

    };

}


/* ============================================================
   NO — CONFIRM
   ============================================================ */

const noConfirm =
  document.getElementById(
    "noConfirm"
  );


if (noConfirm) {

  noConfirm.onclick =
    async () => {

      response =
        "no";


      await finish();

    };

}


/* ============================================================
   RESTART
   ============================================================ */

const restart =
  document.getElementById(
    "restart"
  );


if (restart) {

  restart.onclick =
    () => {

      clearRSVPState();
      sceneHistory.length = 0;


      surveyStatus =
        null;
      surveyStatusCheckedAt = 0;


      document
        .getElementById(
          "codeForm"
        )
        ?.reset();


      const codeMsg =
        document.getElementById(
          "codeMsg"
        );


      if (codeMsg) {

        codeMsg.textContent =
          "";

      }


      const welcome =
        document.getElementById(
          "welcome"
        );


      if (welcome) {

        welcome.textContent =
          "Welcome!";

      }


      const seats =
        document.getElementById(
          "seats"
        );


      if (seats) {

        seats.textContent =
          "0";

      }


      const seatPlural =
        document.getElementById(
          "seatPlural"
        );


      if (seatPlural) {

        seatPlural.textContent =
          "s";

      }


      /*
       * Restart only goes to Scene 0.
       * No server check is needed.
       */

      scenes.forEach(
        currentScene => {

          currentScene
            .classList
            .remove("active");

        }
      );


      scenes[0]
        ?.classList
        .add("active");


      scene =
        0;


      updateDots();

    };

}


/* ============================================================
   INITIAL STATE
   ============================================================ */

/*
 * Start on Scene 0.
 *
 * The opening scene is still shown immediately.
 * We only warm the status cache in the background so that
 * the later protected scenes do not have to wait for a cold
 * Google Apps Script request when the guest reaches them.
 */

scenes.forEach(
  currentScene => {

    currentScene
      .classList
      .remove("active");

  }
);


scenes[0]
  ?.classList
  .add("active");


scene =
  0;


updateDots();


/*
 * Background warm-up only. Never blocks the opening scene.
 */
checkSurveyStatus().catch(() => {});
