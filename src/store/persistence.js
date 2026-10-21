module.exports = (store) => {
  const updatePagetitle = (isPublic) =>
    (document.title = `Blood on the Clocktower ${
      isPublic ? "Town Square" : "Grimoire"
    }`);

  // initialize data
  if (localStorage.getItem("background")) {
    store.commit("setBackground", localStorage.background);
  }
  if (localStorage.getItem("muted")) {
    store.commit("toggleMuted", true);
  }
  if (localStorage.getItem("static")) {
    store.commit("toggleStatic", true);
  }
  if (localStorage.getItem("mockAssignments")) {
    store.commit("toggleMockAssignments", true);
  }
  if (localStorage.getItem("unofficial")) {
    store.commit("toggleUnofficial", true);
  }
  if (localStorage.getItem("imageOptIn")) {
    store.commit("toggleImageOptIn", true);
  }
  if (localStorage.getItem("zoom")) {
    store.commit("setZoom", parseFloat(localStorage.getItem("zoom")));
  }
  if (localStorage.getItem("isGrimoire")) {
    store.commit("toggleGrimoire", false);
    updatePagetitle(false);
  }
  if (localStorage.roles !== undefined) {
    store.commit("setCustomRoles", JSON.parse(localStorage.roles));
    store.commit("setEdition", { id: "custom" });
  }
  if (localStorage.edition !== undefined) {
    // this will initialize state.roles for official editions
    store.commit("setEdition", JSON.parse(localStorage.edition));
  }
  if (localStorage.bluffs !== undefined) {
    JSON.parse(localStorage.bluffs).forEach((role, index) => {
      store.commit("setBluff", {
        index,
        role: store.state.roles.get(role) || {},
      });
    });
  }
  if (localStorage.npcs !== undefined) {
    store.commit("setNpcs", {
      npcs: JSON.parse(localStorage.npcs).map(
        (npc) => store.state.otherNpcs.get(npc.id) || npc,
      ),
    });
  }
  if (localStorage.players) {
    store.commit(
      "players/set",
      JSON.parse(localStorage.players).map((player) => ({
        ...player,
        role:
          store.state.roles.get(player.role) ||
          store.getters.rolesJSONbyId.get(player.role) ||
          {},
      })),
    );
  }
  /**** Session related data *****/
  if (localStorage.getItem("playerId")) {
    store.commit("session/setPlayerId", localStorage.getItem("playerId"));
  }
  if (localStorage.getItem("playerSecret")) {
    store.commit(
      "session/setPlayerSecret",
      localStorage.getItem("playerSecret"),
    );
  }
  if (localStorage.getItem("session") && !window.location.hash.substr(1)) {
    // stored as [isSpectator, sessionId] for backwards compatibility
    const [spectator, sessionId] = JSON.parse(localStorage.getItem("session"));
    store.commit("session/setStoryteller", !spectator);
    store.commit("session/setSessionId", sessionId);
  }

  // listen to mutations
  store.subscribe(({ type, payload }, state) => {
    switch (type) {
      case "toggleGrimoire":
        if (!state.grimoire.isPublic) {
          localStorage.setItem("isGrimoire", 1);
        } else {
          localStorage.removeItem("isGrimoire");
        }
        updatePagetitle(state.grimoire.isPublic);
        break;
      case "setBackground":
        if (payload) {
          localStorage.setItem("background", payload);
        } else {
          localStorage.removeItem("background");
        }
        break;
      case "toggleMuted":
        if (state.grimoire.isMuted) {
          localStorage.setItem("muted", 1);
        } else {
          localStorage.removeItem("muted");
        }
        break;
      case "toggleStatic":
        if (state.grimoire.isStatic) {
          localStorage.setItem("static", 1);
        } else {
          localStorage.removeItem("static");
        }
        break;
      case "toggleMockAssignments":
        if (state.grimoire.isMockAssignmentsAllowed) {
          localStorage.setItem("mockAssignments", 1);
        } else {
          localStorage.removeItem("mockAssignments");
        }
        break;
      case "toggleUnofficial":
        if (state.grimoire.isArtUnofficial) {
          localStorage.setItem("unofficial", 1);
        } else {
          localStorage.removeItem("unofficial");
        }
        break;
      case "toggleImageOptIn":
        if (state.grimoire.isImageOptIn) {
          localStorage.setItem("imageOptIn", 1);
        } else {
          localStorage.removeItem("imageOptIn");
        }
        break;
      case "setZoom":
        if (payload !== 0) {
          localStorage.setItem("zoom", payload);
        } else {
          localStorage.removeItem("zoom");
        }
        break;
      case "setEdition":
        localStorage.setItem("edition", JSON.stringify(payload));
        if (state.edition.isOfficial) {
          localStorage.removeItem("roles");
        }
        localStorage.setItem(
          "npcs",
          JSON.stringify(
            state.npcs.map((npc) => (npc.isCustom ? npc : { id: npc.id })),
          ),
        );
        break;
      case "setCustomRoles":
        if (!payload.length) {
          localStorage.removeItem("roles");
        } else {
          localStorage.setItem("roles", JSON.stringify(payload));
          localStorage.setItem(
            "npcs",
            JSON.stringify(
              state.npcs.map((npc) => (npc.isCustom ? npc : { id: npc.id })),
            ),
          );
        }
        break;
      case "setBluff":
        localStorage.setItem(
          "bluffs",
          JSON.stringify(state.bluffs.map(({ id }) => id)),
        );
        break;
      case "setNpcs":
        localStorage.setItem(
          "npcs",
          JSON.stringify(
            state.npcs.map((npc) => (npc.isCustom ? npc : { id: npc.id })),
          ),
        );
        break;
      case "players/add":
      case "players/update":
      case "players/remove":
      case "players/clear":
      case "players/set":
      case "players/swap":
      case "players/move":
        if (state.players.players.length) {
          localStorage.setItem(
            "players",
            JSON.stringify(
              state.players.players.map((player) => ({
                ...player,
                // simplify the stored data
                role: player.role.id || {},
              })),
            ),
          );
        } else {
          localStorage.removeItem("players");
        }
        break;
      case "session/setSessionId":
        if (payload) {
          localStorage.setItem(
            "session",
            // stored as [isSpectator, sessionId] for backwards compatibility
            JSON.stringify([!state.session.isStoryteller, payload]),
          );
        } else {
          localStorage.removeItem("session");
        }
        break;
      case "session/setPlayerId":
        if (payload) {
          localStorage.setItem("playerId", payload);
        } else {
          localStorage.removeItem("playerId");
        }
        break;
      case "session/setPlayerSecret":
        if (payload) {
          localStorage.setItem("playerSecret", payload);
        } else {
          localStorage.removeItem("playerSecret");
        }
        break;
    }
  });
};
