import Vue from "vue";
import Vuex from "vuex";
import persistence from "./persistence";
import socket from "./socket";
import players from "./modules/players";
import session from "./modules/session";
import editionJSON from "../editions.json";
import rolesJSON from "../roles.json";
import nightJSON from "../nightsheet.json";
import jinxesJSON from "../jinxes.json";

Vue.use(Vuex);

// helper functions
const clean = (id) => id.toLocaleLowerCase().replace(/[^a-z0-9]/g, "");

const getRolesByEdition = (edition = editionJSON[0]) => {
  return new Map(
    edition.roles
      .map((id) => rolesJSONbyId.get(id))
      .sort((a, b) => b.team.localeCompare(a.team))
      .map((role) => [role.id, role]),
  );
};

const getNpcs = () => {
  return new Map(
    rolesFormatted
      .filter((r) => r.team === "fabled" || r.team === "loric")
      .sort((a, b) => b.team.localeCompare(a.team))
      .map((role) => [role.id, role]),
  );
};

const firstNightOrder = nightJSON.firstNight;
const getFirstNightOrder = (id) => {
  // -1 will be raised to 0, others will be 1 or greater.
  return firstNightOrder.indexOf(clean(id)) + 1;
};

const otherNightOrder = nightJSON.otherNight;
const getOtherNightOrder = (id) => {
  // -1 will be raised to 0, others will be 1 or greater.
  return otherNightOrder.indexOf(clean(id)) + 1;
};

const rolesFormatted = rolesJSON.map((role) => {
  role.firstNight = getFirstNightOrder(role.id);
  role.otherNight = getOtherNightOrder(role.id);
  return role;
});

const getTravellersNotInEdition = (edition = editionJSON[0]) => {
  return new Map(
    rolesFormatted
      .filter((r) => r.team === "traveller" && !edition.roles.includes(r.id))
      .map((role) => [role.id, role]),
  );
};

const set =
  (key) =>
  ({ grimoire }, val) => {
    grimoire[key] = val;
  };

const toggle =
  (key) =>
  ({ grimoire }, val) => {
    if (val === true || val === false) {
      grimoire[key] = val;
    } else {
      grimoire[key] = !grimoire[key];
    }
  };

// global data maps
const editionJSONbyId = new Map(
  editionJSON.map((edition) => [edition.id, edition]),
);
const rolesJSONbyId = new Map(rolesFormatted.map((role) => [role.id, role]));

// jinxes
let jinxes = {};
try {
  jinxes = new Map(
    jinxesJSON.map(({ id, jinx }) => [
      clean(id),
      new Map(jinx.map(({ id, reason }) => [clean(id), reason])),
    ]),
  );
  // });
} catch (e) {
  console.error("couldn't load jinxes", e);
}

// base definition for custom roles
const customRole = {
  id: "",
  name: "",
  image: "",
  ability: "",
  edition: "custom",
  firstNight: 0,
  firstNightReminder: "",
  otherNight: 0,
  otherNightReminder: "",
  reminders: [],
  remindersGlobal: [],
  setup: false,
  team: "townsfolk",
  isCustom: true,
};

export default new Vuex.Store({
  modules: {
    players,
    session,
  },
  state: {
    grimoire: {
      isNight: false,
      isNightOrder: true,
      isPublic: false,
      isMenuOpen: false,
      isStatic: false,
      isMuted: false,
      isArtUnofficial: false,
      isImageOptIn: false,
      isMockAssignmentsAllowed: false,
      zoom: 0,
      background: "",
      nightNumber: 0,
      nightStart: null,
      nightEnd: null,
    },
    modals: {
      edition: false,
      npc: false,
      gameState: false,
      messages: false,
      nightOrder: false,
      reference: false,
      reminder: false,
      role: false,
      roles: false,
      voteHistory: false,
    },
    edition: editionJSONbyId.get("tb"),
    roles: getRolesByEdition(),
    npcs: [],
    bluffs: [{}, {}, {}],
    otherTravellers: getTravellersNotInEdition(),
    otherNpcs: getNpcs(),
    jinxes,
  },
  getters: {
    /**
     * Return all custom roles, with default values and non-essential data stripped.
     * Role object keys will be replaced with a numerical index to conserve bandwidth.
     * @param roles
     * @param npcs
     * @returns {[]}
     */
    customRolesStripped: ({ roles, npcs }) => {
      const customRoles = [];
      const customKeys = Object.keys(customRole);
      const strippedProps = [];
      new Map([...roles, ...npcs.map((npc) => [npc.id, npc])]).forEach(
        (role) => {
          if (!role.isCustom) {
            customRoles.push({ id: role.id });
          } else {
            const strippedRole = {};
            for (let prop in role) {
              if (strippedProps.includes(prop)) {
                continue;
              }
              const value = role[prop];
              if (customKeys.includes(prop) && value !== customRole[prop]) {
                strippedRole[customKeys.indexOf(prop)] = value;
              }
            }
            customRoles.push(strippedRole);
          }
        },
      );
      return customRoles;
    },
    getFirstNightOrder: () => (id) => getFirstNightOrder(id),
    getOtherNightOrder: () => (id) => getOtherNightOrder(id),
    getImage:
      ({ grimoire }) =>
      (role, alignmentIndex) => {
        if (role.image && grimoire.isImageOptIn) {
          if (Array.isArray(role.image)) {
            return role.image[alignmentIndex] || role.image[0];
          }
          return role.image;
        }

        const useUnofficialArt =
          ["good", "evil"].includes(role.imageAlt) || grimoire.isArtUnofficial;
        const alignment = ["fabled", "loric"].includes(role.team)
          ? ""
          : ["townsfolk", "outsider"].includes(role.team)
            ? alignmentIndex === 0
              ? "_g"
              : "_e"
            : ["minion", "demon"].includes(role.team)
              ? alignmentIndex === 0
                ? "_e"
                : "_g"
              : alignmentIndex === 1
                ? "_g"
                : alignmentIndex === 2
                  ? "_e"
                  : "";
        return require(
          "../assets/icons/" +
            (useUnofficialArt
              ? "unofficial/" +
                (alignmentIndex > 0 ? "Alternate/" : "") +
                (role.imageAlt || role.id) +
                (role.team === "traveller" ? alignment : "")
              : "official/" +
                (role.imageAlt ? "generic" : role.edition) +
                "/" +
                (role.imageAlt || role.id) +
                alignment) +
            ".webp",
        );
      },
    clean: () => (id) => clean(id),
    rolesJSONbyId: () => rolesJSONbyId,
  },
  mutations: {
    setZoom: set("zoom"),
    setBackground: set("background"),
    toggleMuted: toggle("isMuted"),
    toggleMenu: toggle("isMenuOpen"),
    toggleNightOrder: toggle("isNightOrder"),
    toggleStatic: toggle("isStatic"),
    toggleMockAssignments: toggle("isMockAssignmentsAllowed"),
    toggleNight({ grimoire, players, edition, session }, val) {
      // Reset the hasResponded var for the next night.
      players.players.map((player) => {
        player.hasResponded = {};
      });

      // This function can be called with an explicit value pushed from the
      // socket. In that case, the value the host has declared takes effect,
      // assuming it is at least a valid boolean.
      if (val === true || val === false) {
        grimoire.isNight = val;
      } else {
        grimoire.isNight = !grimoire.isNight;
      }

      // Record the length of days and nights if is ST.
      if (session.isStoryteller) {
        return;
      }
      if (grimoire.isNight) {
        grimoire.nightNumber++;
        grimoire.nightStart = new Date();

        if (grimoire.nightEnd !== null) {
          const duration = Math.floor(
            Math.abs(grimoire.nightStart - grimoire.nightEnd) / 1000,
          );
          gtag("event", "day_end", {
            duration: duration,
            playerCount: players.players.length,
            nightNumber: grimoire.nightNumber,
            edition: edition.name,
          });
        }
      } else if (grimoire.nightStart !== null) {
        grimoire.nightEnd = new Date();
        const duration = Math.floor(
          Math.abs(grimoire.nightEnd - grimoire.nightStart) / 1000,
        );
        gtag("event", "night_end", {
          duration: duration,
          playerCount: players.players.length,
          nightNumber: grimoire.nightNumber,
          edition: edition.name,
        });
      }
    },
    toggleGrimoire: toggle("isPublic"),
    toggleUnofficial: toggle("isArtUnofficial"),
    toggleImageOptIn: toggle("isImageOptIn"),
    toggleModal({ modals }, name) {
      if (name) {
        modals[name] = !modals[name];
      }
      for (let modal in modals) {
        if (modal === name) continue;
        modals[modal] = false;
      }
    },
    /**
     * Store custom roles
     * @param state
     * @param roles Array of role IDs or full role definitions
     */
    setCustomRoles(state, roles) {
      const processedRoles = roles
        // replace numerical role object keys with matching key names
        .map((role) => {
          if (role[0]) {
            const customKeys = Object.keys(customRole);
            const mappedRole = {};
            for (let prop in role) {
              if (customKeys[prop]) {
                mappedRole[customKeys[prop]] = role[prop];
              }
            }
            return mappedRole;
          } else {
            return role;
          }
        })
        // clean up role.id and role.team
        .map((role) => {
          role.id = clean(role.id);
          if (role.team === "traveler") {
            role.team = "traveller";
          }
          return role;
        })
        // map existing roles to base definition or pre-populate custom roles to ensure all properties
        .map(
          (role) =>
            rolesJSONbyId.get(role.id) ||
            state.roles.get(role.id) ||
            Object.assign({}, customRole, role),
        )
        // default empty icons and placeholders, clean up firstNight / otherNight
        .map((role) => {
          if (rolesJSONbyId.get(role.id)) return role;
          role.imageAlt = // map team to generic icon
            {
              townsfolk: "townsfolk",
              outsider: "outsider",
              minion: "minion",
              demon: "demon",
              fabled: "fabled",
              loric: "loric",
            }[role.team] || "traveller";
          role.firstNight = Math.abs(role.firstNight);
          role.otherNight = Math.abs(role.otherNight);
          if (role.jinxes && role.jinxes.length) {
            role.jinxes = new Map(
              role.jinxes.map(({ id, reason }) => [clean(id), reason]),
            );
          }
          return role;
        })
        // filter out roles that don't match an existing role and also don't have name/ability/team
        .filter((role) => role.name && role.ability && role.team)
        // sort by team
        .sort((a, b) => b.team.localeCompare(a.team));
      // convert to Map without NPCs and set roles
      state.roles = new Map(
        processedRoles
          .filter((role) => role.team !== "fabled" && role.team !== "loric")
          .map((role) => [role.id, role]),
      );
      // update NPCS to include custom NPCs from this script
      state.otherNpcs = new Map([
        ...processedRoles
          .filter((r) => r.team === "fabled" || r.team === "loric")
          .map((r) => [r.id, r]),
        ...state.otherNpcs,
      ]);
      // update extraTravellers map to only show travellers not in this script
      state.otherTravellers = new Map(
        rolesFormatted
          .filter(
            (r) =>
              r.team === "traveller" &&
              !processedRoles.some((i) => i.id === r.id),
          )
          .map((role) => [role.id, role]),
      );
      // check for NPCs and set those, if present
      processedRoles.forEach((role) => {
        if (
          state.otherNpcs.has(role.id || role) &&
          !state.npcs.some((npc) => npc.id === role.id)
        ) {
          state.npcs.push(state.otherNpcs.get(role.id || role));
        }
      });
      if (
        processedRoles.some((role) =>
          new Map([
            ...(state.jinxes.get(role.id) || []),
            ...(role.jinxes || []),
          ])
            .keys()
            .some((second) =>
              processedRoles.some((role) => role.id === second),
            ),
        ) &&
        !state.npcs.some((npc) => npc.id === "djinn")
      ) {
        state.npcs.push(state.otherNpcs.get("djinn"));
      }
      if (
        processedRoles.some((role) => role.isCustom) &&
        !state.npcs.some((npc) => npc.id === "bootlegger")
      ) {
        state.npcs.push(state.otherNpcs.get("bootlegger"));
      }
    },
    setBluff(state, { index, role } = {}) {
      if (index !== undefined) {
        state.bluffs.splice(index, 1, role);
      } else {
        state.bluffs = [{}, {}, {}];
      }
    },
    setNpcs(state, { index, npcs } = {}) {
      if (index !== undefined) {
        state.npcs.splice(index, 1);
      } else if (npcs) {
        if (!Array.isArray(npcs)) {
          state.npcs.push(npcs);
        } else {
          state.npcs = npcs;
        }
      } else {
        state.npcs = [];
      }
    },
    setEdition(state, edition) {
      state.grimoire.nightNumber = 0;
      state.grimoire.nightStart = null;
      state.grimoire.nightEnd = null;

      if (editionJSONbyId.has(edition.id)) {
        state.edition = editionJSONbyId.get(edition.id);
        state.roles = getRolesByEdition(state.edition);
        state.otherTravellers = getTravellersNotInEdition(state.edition);
      } else {
        state.edition = edition;
      }

      if (
        edition.bootlegger &&
        !state.npcs.some((npc) => npc.id === "bootlegger")
      ) {
        state.npcs.push(state.otherNpcs.get("bootlegger"));
      }

      state.modals.edition = false;
    },
  },
  plugins: [persistence, socket],
});
