<template>
  <Modal
    v-if="isDisplayed"
    @close="toggleModal('reminder')"
  >
    <h3>Choose a reminder token:</h3>
    <ul class="reminders">
      <li
        v-for="reminder in availableReminders"
        class="reminder"
        :class="[reminder.role, { match: queryMatches(reminder.name) }]"
        :key="reminder.role + ' ' + reminder.name"
        @click="addReminder(reminder)"
      >
        <span
          class="icon"
          :style="{
            backgroundImage: `url(${
              reminder.image && grimoire.isImageOptIn
                ? (Array.isArray(reminder.image) ? reminder.image[0] : reminder.image)
                : require(
                    '../../assets/icons/' +
                      (reminder.imageAlt || reminder.role) +
                      '.webp',
                  )
            })`,
          }"
        ></span>
        <span class="text">{{ reminder.name }}</span>
      </li>
    </ul>
    <input
      ref="searchInput"
      class="reminder-search"
      placeholder="Search"
      v-model="query"
      @keyup="keyup"
    />
  </Modal>
</template>

<script>
import Modal from "./Modal";
import { mapMutations, mapState } from "vuex";

/**
 * Helper function that maps a reminder name with a role-based object that provides necessary visual data.
 * @param role The role for which the reminder should be generated
 * @return {function(*): {image: string|string[]|string|*, role: *, name: *, imageAlt: string|*}}
 */
const mapReminder =
  ({ id, image, imageAlt }) =>
  (name) => ({
    role: id,
    image,
    imageAlt,
    name,
  });

export default {
  components: { Modal },
  props: ["playerIndex"],
  computed: {
    availableReminders() {
      let reminders = [];
      const { players, bluffs } = this.$store.state.players;
      this.$store.state.roles.forEach((role) => {
        // add reminders from player roles and bluff/other roles
        if (players.some((p) => p.role.id === role.id) || bluffs.some((bluff) => bluff.id === role.id)) {
          role.reminders.map(mapReminder(role)).forEach((reminder1) => {
            if (
              !reminders.some(
                (reminder2) =>
                  reminder2.name === reminder1.name &&
                  reminder2.role === reminder1.role,
              )
            ) {
              reminders.push(reminder1);
            }
          });
        }
        // add global reminders
        if (role.remindersGlobal && role.remindersGlobal.length) {
          role.remindersGlobal.map(mapReminder(role)).forEach((reminder1) => {
            if (
              !reminders.some(
                (reminder2) =>
                  reminder2.name === reminder1.name &&
                  reminder2.role === reminder1.role,
              )
            ) {
              reminders.push(reminder1);
            }
          });
        }
      });
      // add fabled reminders
      this.$store.state.players.fabled.forEach((role) => {
        reminders = [...reminders, ...role.reminders.map(mapReminder(role))];
      });

      // add out of script traveller reminders
      this.$store.state.otherTravellers.forEach((role) => {
        if (players.some((p) => p.role.id === role.id)) {
          role.reminders.map(mapReminder(role)).forEach((reminder1) => {
            if (
              !reminders.some(
                (reminder2) =>
                  reminder2.name === reminder1.name &&
                  reminder2.role === reminder1.role,
              )
            ) {
              reminders.push(reminder1);
            }
          });
        }
      });

      reminders.push({ role: "good", name: "Good" });
      reminders.push({ role: "evil", name: "Evil" });
      reminders.push({ role: "custom", name: "Custom note" });
      return reminders;
    },
    isDisplayed() {
      return this.modals.reminder && this.availableReminders.length && this.players[playerIndex]
    },
    ...mapState(["modals", "grimoire"]),
    ...mapState("players", ["players"]),
  },
  data() {
    return {
      query: "",
    };
  },
  methods: {
    addReminder(reminder) {
      const player = this.$store.state.players.players[this.playerIndex];
      let value;
      if (reminder.role === "custom") {
        const name = prompt("Add a custom reminder note");
        if (!name) return;
        value = [...player.reminders, { role: "custom", name }];
      } else {
        value = [...player.reminders, reminder];
      }
      this.$store.commit("players/update", {
        player,
        property: "reminders",
        value,
      });
      this.$store.commit("toggleModal", "reminder");
    },
    keyup(event) {
      // Allow Escape for modal dialog dismissal.
      if (event.key === "Esc" || event.key === "Escape") return;

      event.stopPropagation();

      // If there's a unique match and the user presses Enter, select that role.
      if (event.key === "Enter") {
        const matchingReminders = this.availableReminders.filter((r) =>
          this.queryMatches(r.name),
        );
        if (matchingReminders.length === 1) {
          this.addReminder(matchingReminders[0]);
        }
      }
    },
    queryMatches(name) {
      // A search query matches if, after removing all non-word characters,
      // it is a case-insensitive prefix of the character name.
      const simplify = (str) => str.replaceAll(/\W+/g, "").toLowerCase();
      return simplify(name || "").startsWith(simplify(this.query));
    },
    ...mapMutations(["toggleModal"]),
  },
  watch: {
    isDisplayed(shown) {
      if (shown) this.$nextTick(() => this.$refs.searchInput.focus());
    },
  },
};
</script>

<style scoped lang="scss">
ul.reminders .reminder {
  background: url("../../assets/reminder.png") center center;
  background-size: 100%;
  width: 14vh;
  height: 14vh;
  max-width: 100px;
  max-height: 100px;
  display: flex;
  justify-content: center;
  align-items: center;
  margin: 1%;

  border-radius: 50%;
  border: 3px solid black;
  box-shadow: 0 0 10px rgba(0, 0, 0, 0.5);
  cursor: pointer;
  line-height: 100%;
  transition: transform 500ms ease;

  .icon {
    position: absolute;
    top: 0;
    width: 90%;
    height: 90%;
    background-size: 100%;
    background-position: center center;
    background-repeat: no-repeat;
  }

  .text {
    color: black;
    font-size: 65%;
    font-weight: bold;
    text-align: center;
    top: 28%;
    width: 80%;
    line-height: 1;
    @media (orientation: portrait) {
      font-size: 100%;
    }
  }

  &:hover {
    transform: scale(1.2);
  }

  &:not(.match) {
    opacity: 0.4;
  }
}

input.reminder-search {
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
