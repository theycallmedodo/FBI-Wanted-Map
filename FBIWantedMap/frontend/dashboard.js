document.getElementById("show-all-states").addEventListener("click", () => {
  const iframe = document.querySelector("iframe");
  const selectedStateHeader = document.getElementById("selected-state");

  const params = encodeURIComponent(JSON.stringify({
    "ds0.selected_state": "All"
  }));

  const newURL = `https://lookerstudio.google.com/embed/reporting/6e46568f-461b-49b8-a428-6abe29013e9d/page/KE3NF?params=${params}`;
  iframe.src = newURL;

  selectedStateHeader.innerHTML = "Selected all states";

  if (window.map) {
    window.map.setView([37.8, -96], 4);
  }
});

function setDashboardState(stateName) {
  const iframe = document.querySelector("iframe");
  const selectedStateHeader = document.getElementById("selected-state");

  const params = encodeURIComponent(JSON.stringify({
    "ds0.selected_state": stateName
  }));

  const newURL = `https://lookerstudio.google.com/embed/reporting/6e46568f-461b-49b8-a428-6abe29013e9d/page/KE3NF?params=${params}`;
  iframe.src = newURL;

  selectedStateHeader.innerHTML = `Selected state: ${stateName}`;

  if (window.map && window.stateCenters && window.stateCenters[stateName]) {
    window.map.setView(window.stateCenters[stateName], 6);
  }
}