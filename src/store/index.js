import Vue from "vue";
import Vuex from "vuex";
import persistence from "./persistence";
import socket from "./socket";
import players from "./modules/players";
import session from "./modules/session";
import { getRoleImage } from "./images";
import {
  byTeam,
  clean,
  customRole,
  editionJSONbyId,
  getAllNpcs,
  getFirstNightOrder,
  getOtherNightOrder,
  getRolesByEdition,
  getTravellersNotIn,
  hasJinxAmong,
  isNpc,
  jinxes,
  prepareCustomRole,
  rolesJSONbyId,
  stripCustomRole,
  toRoleMap,
  unstripCustomRole,
} from "./roles";

Vue.use(Vuex);

// set a flag to val if it's a boolean, otherwise flip it
const setOrFlip = (obj, key, val) => {
  obj[key] = typeof val === "boolean" ? val : !obj[key];
};

const set =
  (key) =>
  ({ grimoire }, val) => {
    grimoire[key] = val;
  };

const toggle =
  (key) =>
  ({ grimoire }, val) =>
    setOrFlip(grimoire, key, val);

// put an NPC (Fabled / Loric) into play, unless it already is
const addNpc = (state, id) => {
  if (!state.npcs.some((npc) => npc.id === id)) {
    state.npcs.push(state.otherNpcs.get(id));
  }
};

const defaultEdition = editionJSONbyId.get("tb");

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
    edition: defaultEdition,
    roles: getRolesByEdition(defaultEdition),
    npcs: [],
    bluffs: [{}, {}, {}],
    otherTravellers: getTravellersNotIn(defaultEdition.roles),
    otherNpcs: getAllNpcs(),
    jinxes,
  },
  getters: {
    /**
     * All roles in play, for sending to players. Official roles are sent as
     * just their ID, custom roles are stripped down by stripCustomRole.
     */
    customRolesStripped: ({ roles, npcs }) =>
      [...new Map([...roles, ...toRoleMap(npcs)]).values()].map((role) =>
        role.isCustom ? stripCustomRole(role) : { id: role.id },
      ),
    getFirstNightOrder: () => getFirstNightOrder,
    getOtherNightOrder: () => getOtherNightOrder,
    getImage:
      ({ grimoire }) =>
      (role, alignmentIndex) =>
        getRoleImage(role, alignmentIndex, grimoire),
    clean: () => clean,
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
    toggleGrimoire: toggle("isPublic"),
    toggleUnofficial: toggle("isArtUnofficial"),
    toggleImageOptIn: toggle("isImageOptIn"),
    toggleNight({ grimoire, players, session }, val) {
      // Reset the hasResponded var for the next night.
      players.players.forEach((player) => {
        player.hasResponded = {};
      });

      // val is set when the host's value is pushed through the socket
      setOrFlip(grimoire, "isNight", val);

      // Record the start and end of nights if is ST.
      if (!session.isStoryteller) {
        return;
      }
      if (grimoire.isNight) {
        grimoire.nightNumber++;
        grimoire.nightStart = new Date();
      } else if (grimoire.nightStart !== null) {
        grimoire.nightEnd = new Date();
      }
    },
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
        .map(unstripCustomRole)
        .map((role) => {
          role.id = clean(role.id);
          if (role.team === "traveler") {
            role.team = "traveller";
          }
          return role;
        })
        // use the official or already loaded definition, if there is one
        .map(
          (role) =>
            rolesJSONbyId.get(role.id) ||
            state.roles.get(role.id) ||
            Object.assign({}, customRole, role),
        )
        .map((role) =>
          rolesJSONbyId.has(role.id) ? role : prepareCustomRole(role),
        )
        // drop custom roles that are missing a name, ability or team
        .filter((role) => role.name && role.ability && role.team)
        .sort(byTeam);

      state.roles = toRoleMap(processedRoles.filter((role) => !isNpc(role)));
      // custom NPCs from this script become available alongside official ones
      state.otherNpcs = new Map([
        ...toRoleMap(processedRoles.filter(isNpc)),
        ...state.otherNpcs,
      ]);
      state.otherTravellers = getTravellersNotIn(
        processedRoles.map((role) => role.id),
      );

      processedRoles.forEach((role) => {
        if (state.otherNpcs.has(role.id)) {
          addNpc(state, role.id);
        }
      });
      if (hasJinxAmong(processedRoles, state.jinxes)) {
        addNpc(state, "djinn");
      }
      if (processedRoles.some((role) => role.isCustom)) {
        addNpc(state, "bootlegger");
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
        state.otherTravellers = getTravellersNotIn(state.edition.roles);
      } else {
        state.edition = edition;
      }

      if (edition.bootlegger) {
        addNpc(state, "bootlegger");
      }

      state.modals.edition = false;
    },
  },
  plugins: [persistence, socket],
});
