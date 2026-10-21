<template>
  <Modal class="role" v-if="isDisplayed" @close="toggleModal('role')">
    <ul class="heading">
      <li>
        <div class="button-group alignment">
          <span
            v-if="playerIndex >= 0 && players.length"
            class="button alignment"
            :class="{
              townsfolk: alignment === 'Good',
              demon: alignment === 'Evil',
            }"
            @click="toggleAlignment"
            >{{ alignment }}</span
          >
        </div>
      </li>
      <li>
        <h3>
          Choose a new character for
          {{
            playerIndex >= 0 && players.length
              ? players[playerIndex].name
              : "bluffing"
          }}:
        </h3>
      </li>
    </ul>
    <ul class="tokens">
      <li
        v-for="role in displayedRoles"
        :class="[role.team, { match: queryMatches(role.name) }]"
        :key="role.id"
        @click="setRole(role, getAlignmentIndex(role))"
      >
        <Token :role="role" :alignment-index="getAlignmentIndex(role)" />
      </li>
    </ul>
    <div
      class="button-group"
      v-if="playerIndex >= 0 && otherTravellers.size && session.isStoryteller"
    >
      <span
        class="button"
        :class="{ townsfolk: tab === 'editionRoles' }"
        @click="tab = 'editionRoles'"
      >
        Edition Roles
      </span>
      <span
        class="button"
        :class="{ townsfolk: tab === 'otherTravellers' }"
        @click="tab = 'otherTravellers'"
      >
        Other Travellers
      </span>
    </div>
    <input
      ref="searchInput"
      class="role-search"
      placeholder="Search"
      v-model="query"
      @keyup="keyup"
    />
  </Modal>
</template>

<script>
import { mapMutations, mapState } from "vuex";
import Modal from "./Modal";
import Token from "../Token";

export default {
  components: { Token, Modal },
  props: ["playerIndex"],
  computed: {
    availableRoles() {
      const availableRoles = [];
      const players = this.$store.state.players.players;
      this.$store.state.roles.forEach((role) => {
        // don't show bluff roles that are already assigned to players
        if (
          this.playerIndex >= 0 ||
          (this.playerIndex < 0 &&
            !players.some((player) => player.role.id === role.id))
        ) {
          availableRoles.push(role);
        }
      });
      availableRoles.push({});
      return availableRoles;
    },
    isDisplayed() {
      return this.modals.role && this.availableRoles.length;
    },
    displayedRoles() {
      if (this.tab === "editionRoles" || !this.otherTravellers.size)
        return this.availableRoles;
      else return [...this.otherTravellers.values()];
    },
    ...mapState(["modals", "roles", "session"]),
    ...mapState("players", ["players"]),
    ...mapState(["otherTravellers"]),
  },
  data() {
    return {
      tab: "editionRoles",
      alignment: "Regular",
      query: "",
    };
  },
  methods: {
    setRole(role, alignmentIndex) {
      if (this.playerIndex < 0) {
        // assign to bluff slot (index < 0)
        this.$store.commit("setBluff", {
          index: this.playerIndex * -1 - 1,
          role,
        });
      } else {
        if (!this.session.isStoryteller && role.team === "traveller") return;
        // assign to player
        const player = this.$store.state.players.players[this.playerIndex];
        this.$store.commit("players/update", {
          player,
          property: "role",
          value: role,
        });
        this.$store.commit("players/update", {
          player,
          property: "alignmentIndex",
          value: alignmentIndex,
        });
      }
      this.$store.commit("toggleModal", "role");
    },
    toggleAlignment() {
      if (this.alignment === "Regular") this.alignment = "Good";
      else if (this.alignment === "Good") this.alignment = "Evil";
      else this.alignment = "Regular";
    },
    getAlignmentIndex(role) {
      if (this.alignment === "Evil") {
        if (role.team === "traveller") return 2;
        else if (role.team !== "minion" && role.team !== "demon") return 1;
      }
      if (
        this.alignment === "Good" &&
        (role.team === "traveller" ||
          role.team === "minion" ||
          role.team === "demon")
      )
        return 1;
      return 0;
    },
    queryMatches(name) {
      // A search query matches if, after removing all non-word characters,
      // it is a case-insensitive prefix of the character name.
      const simplify = (str) => str.replaceAll(/\W+/g, "").toLowerCase();
      return simplify(name || "").startsWith(simplify(this.query));
    },
    keyup(event) {
      // Allow Escape for modal dialog dismissal.
      if (event.key === "Esc" || event.key === "Escape") return;
      if (event.key === "Control") this.toggleAlignment();

      event.stopPropagation();

      // If there's a unique match and the user presses Enter, select that role.
      if (event.key === "Enter") {
        const matchingRoles = this.displayedRoles.filter((r) =>
          this.queryMatches(r.name),
        );
        if (matchingRoles.length === 1) {
          const role = matchingRoles[0];
          this.setRole(role, this.getAlignmentIndex(role));
        }
      }
    },
    ...mapMutations(["toggleModal"]),
  },
  watch: {
    isDisplayed(shown) {
      if (shown) {
        this.tab = "editionRoles";
        this.alignment = "Regular";
        this.query = "";
        this.$nextTick(() => this.$refs.searchInput.focus());
      }
    },
  },
};
</script>

<style scoped lang="scss">
@import "../../vars.scss";

.modal {
  overflow-y: auto;
  overflow-x: hidden;
}

ul.heading {
  display: grid;
  justify-items: center;
  grid-template-columns: 1fr auto 1fr;
  grid-column-gap: 5px;
  li:nth-child(1) {
    margin-right: auto;
  }
}

ul.tokens li {
  border-radius: 50%;
  width: 6vw;
  margin: 1%;
  transition: transform 500ms ease;

  @media (orientation: portrait) {
    width: 8vh;
  }

  &.townsfolk {
    box-shadow:
      0 0 10px $townsfolk,
      0 0 10px #004cff;
  }
  &.outsider {
    box-shadow:
      0 0 10px $outsider,
      0 0 10px $outsider;
  }
  &.minion {
    box-shadow:
      0 0 10px $minion,
      0 0 10px $minion;
  }
  &.demon {
    box-shadow:
      0 0 10px $demon,
      0 0 10px $demon;
  }
  &.traveller {
    box-shadow:
      0 0 10px $traveller,
      0 0 10px $traveller;
  }
  &:hover {
    transform: scale(1.2);
    z-index: 10;
  }
  &:not(.match) {
    opacity: 0.4;
  }
}

#townsquare:not(.storyteller) ul.tokens li.traveller {
  display: none;
}

input.role-search {
  display: block;
  width: 100%;
  background: transparent;
  border: solid white;
  border-width: 0 0 1px 0;
  outline: none;
  color: white;
  font-size: 1em;
  touch-action: none;

  &:not(:focus) {
    border-bottom-color: #777;
  }
}
</style>
