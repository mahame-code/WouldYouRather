const DOM_ELEMENTS = {
  right: {
    card: document.querySelector("#right-card"),
    image: document.querySelector("#right-img"),
    title: document.querySelector("#right-title"),
    subtitle: document.querySelector("#right-subtitle"),
    button: document.querySelector("#right-btn"),
  },

  left: {
    card: document.querySelector("#left-card"),
    image: document.querySelector("#left-img"),
    title: document.querySelector("#left-title"),
    subtitle: document.querySelector("#left-subtitle"),
    button: document.querySelector("#left-btn"),
  },
  next: document.querySelector("#next-btn"),
  loader: document.querySelector("#loader"),
};

let challengeId = null;
let isVoted = false;

function updateChoice(choice, value) {
  const domChoice = DOM_ELEMENTS[choice];

  if (!domChoice) return;

  if (value.image) {
    domChoice.image.src = value.image;
  }
  if (value.title) {
    domChoice.title.textContent = value.title;
  }
  if (value.subtitle) {
    domChoice.subtitle.textContent = value.subtitle;
    domChoice.subtitle.classList.remove("hidden");
  } else {
    domChoice.subtitle.classList.add("hidden");
  }

  if (value.state) {
    domChoice.card.classList.add(value.state);
  } else {
    domChoice.card.classList.remove("winner", "loser");
  }
}

function updateActions(isVoted) {
  DOM_ELEMENTS.left.button?.classList.toggle("hidden", isVoted);
  DOM_ELEMENTS.right.button?.classList.toggle("hidden", isVoted);
  DOM_ELEMENTS.next?.classList.toggle("hidden", !isVoted);
}

async function loadRandomChallenge() {
  DOM_ELEMENTS.loader?.classList.remove("hidden");
  const result = await fetch("/api/challenges/random").then((r) => r.json());

  challengeId = result.id;
  updateChoice("left", {
    image: result.left_img_url,
    title: result.left_label,
  });

  updateChoice("right", {
    image: result.right_img_url,
    title: result.right_label,
  });
  DOM_ELEMENTS.loader?.classList.add("hidden");
}

async function voteChoice(choice) {
  console.log("voteChoice :", choice);

  if (!challengeId) {
    alert("No challenge loaded");
    return;
  }
  if (isVoted) {
    next();
    return;
  }
  isVoted = true;
  console.log(challengeId);
  const result = await fetch(`/api/challenges/${challengeId}/votes`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ choice }),
  }).then((res) => res.json());

  console.log("result :", { result });

  // Afficher les pourcentages

  const leftVotePercentage = Math.round(
    (result.left_votes * 100) / result.total_votes
  );

  const rightVotePercentage = Math.round(
    (result.right_votes * 100) / result.total_votes
  );

  console.log("pourcentage :", rightVotePercentage, leftVotePercentage);
  console.log(
    "votes",
    result.left_votes,
    result.right_votes,
    result.total_votes
  );

  updateChoice("left", {
    subtitle: `${leftVotePercentage}%`,
    state: leftVotePercentage > 50 ? "winner" : "loser",
  });
  updateChoice("right", {
    subtitle: `${rightVotePercentage}%`,
    state: rightVotePercentage > 50 ? "winner" : "loser",
  });
  updateActions(true);
}

async function next() {
  updateActions(false);
  await loadRandomChallenge();
  isVoted = false;
}

document.addEventListener("DOMContentLoaded", () => {
  loadRandomChallenge();
  // Ajouter les listeners sur les boutons
});

DOM_ELEMENTS.next?.addEventListener("click", () => {
  next();
});
DOM_ELEMENTS.left.button?.addEventListener("click", () => {
  voteChoice("left");
});
DOM_ELEMENTS.left.card?.addEventListener("click", () => {
  voteChoice("left");
});
DOM_ELEMENTS.right.button?.addEventListener("click", () => {
  voteChoice("right");
});
DOM_ELEMENTS.right.card?.addEventListener("click", () => {
  voteChoice("right");
});
