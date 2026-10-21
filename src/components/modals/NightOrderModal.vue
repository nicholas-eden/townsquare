<template>
  <Modal
    class="night-reference"
    :class="{
      storyteller: session.isStoryteller,
    }"
    @close="toggleModal('nightOrder')"
    v-if="modals.nightOrder && roles.size"
  >
    <font-awesome-icon
      @click="toggleModal('reference')"
      icon="address-card"
      class="toggle"
      title="Show Character Reference"
    />
    <h3>
      Night Order
      <br />
      <font-awesome-icon icon="cloud-moon" />
      {{ edition.name || "Custom Script" }}
    </h3>
    <div class="night">
      <ul class="first">
        <li class="headline">First Night</li>
        <li
          v-for="role in rolesFirstNight"
          :key="role.name"
          :class="[role.team]"
        >
          <span class="name">
            {{ role.name }}
            <span class="player" v-if="role.players.length">
              <br />
              <small
                v-for="(player, index) in role.players"
                :class="{ dead: player.isDead }"
                :key="index"
              >
                <template v-if="session.isStoryteller">
                  <div class="option" @click="setResponded(player, role.id)">
                    {{ player.name }}
                    <font-awesome-icon
                      :icon="[
                        'fas',
                        !!player.hasResponded[role.id]
                          ? 'check-square'
                          : 'square',
                      ]"
                    />
                  </div>
                </template>
                <template v-if="!session.isStoryteller">{{
                  player.name + (role.players.length > index + 1 ? "," : "")
                }}</template>
              </small>
            </span>
          </span>
          <span
            class="icon"
            v-if="role.id"
            :style="{
              backgroundImage: `url(${getNightOrderImage(role)})`,
            }"
          ></span>
          <span
            class="reminder"
            v-if="role.firstNightReminder"
            v-html="formatNightReminder(role.firstNightReminder)"
          />
        </li>
      </ul>
      <ul class="other">
        <li class="headline">Other Nights</li>
        <li
          v-for="role in rolesOtherNight"
          :key="role.name"
          :class="[role.team]"
        >
          <span
            class="icon"
            v-if="role.id"
            :style="{
              backgroundImage: `url(${getNightOrderImage(role)})`,
            }"
          ></span>
          <span class="name">
            {{ role.name }}
            <span class="player" v-if="role.players.length">
              <br />
              <small
                v-for="(player, index) in role.players"
                :class="{ dead: player.isDead }"
                :key="index"
              >
                <template v-if="session.isStoryteller">
                  <div class="option" @click="setResponded(player, role.id)">
                    <font-awesome-icon
                      :icon="[
                        'fas',
                        !!player.hasResponded[role.id]
                          ? 'check-square'
                          : 'square',
                      ]"
                    />
                    {{ player.name }}
                  </div>
                </template>
                <template v-if="!session.isStoryteller">{{
                  player.name + (role.players.length > index + 1 ? "," : "")
                }}</template>
              </small>
            </span>
          </span>
          <span
            class="reminder"
            v-if="role.otherNightReminder"
            v-html="formatNightReminder(role.otherNightReminder)"
          />
        </li>
      </ul>
    </div>
  </Modal>
</template>

<script>
import Modal from "./Modal";
import { mapGetters, mapMutations, mapState } from "vuex";

export default {
  components: {
    Modal,
  },
  computed: {
    rolesFirstNight: function () {
      const rolesFirstNight = [];
      // add dusk and dawn to first night order sheet
      const duskIndex = this.edition.firstNight
        ? this.edition.firstNight.indexOf("dusk") + 1
        : this.getFirstNightOrder("dusk");
      const dawnIndex = this.edition.firstNight
        ? this.edition.firstNight.indexOf("dawn") + 1
        : this.getFirstNightOrder("dawn");
      if (duskIndex > 0) {
        rolesFirstNight.push({
          id: "dusk",
          name: "Dusk",
          firstNight: duskIndex,
          firstNightReminder: "Start the Night Phase.",
          players: [],
        });
      }
      if (dawnIndex > 0) {
        rolesFirstNight.push({
          id: "dawn",
          name: "Dawn",
          firstNight: dawnIndex,
          firstNightReminder: "Wait a few seconds. End the Night Phase.",
          players: [],
        });
      }
      // add minion / demon infos to night order sheet
      if (this.players.length > 6) {
        const minionIndex = this.edition.firstNight
          ? this.edition.firstNight.indexOf("minioninfo") + 1
          : this.getFirstNightOrder("minioninfo");
        const demonIndex = this.edition.firstNight
          ? this.edition.firstNight.indexOf("demoninfo") + 1
          : this.getFirstNightOrder("demoninfo");
        if (minionIndex > 0) {
          rolesFirstNight.push({
            id: "minioninfo",
            name: "Minion info",
            firstNight: minionIndex,
            team: "minion",
            players: this.players.filter((p) => p.role.team === "minion"),
            firstNightReminder:
              "If there are 7 or more players, wake all Minions: Show the *THIS IS THE DEMON* token. Point to the Demon. Show the *THESE ARE YOUR MINIONS* token. Point to the other Minions.",
          });
        }
        if (demonIndex > 0) {
          rolesFirstNight.push({
            id: "demoninfo",
            name: "Demon info & bluffs",
            firstNight: demonIndex,
            team: "demon",
            players: this.players.filter((p) => p.role.team === "demon"),
            firstNightReminder:
              "If there are 7 or more players, wake the Demon: Show the *THESE ARE YOUR MINIONS* token. Point to all Minions. Show the *THESE CHARACTERS ARE NOT IN PLAY* token. Show 3 not-in-play good character tokens.",
          });
        }
      }
      const adjustedRoles = new Map(this.roles);
      adjustedRoles.forEach((role) => {
        if (this.edition.firstNight) {
          const newFirstNight = this.edition.firstNight.indexOf(role.id) + 1;
          role = Object.assign({}, role, { firstNight: newFirstNight });
        }
        const players = this.players.filter((p) => p.role.id === role.id);
        if (role.firstNight && (role.team !== "traveller" || players.length)) {
          rolesFirstNight.push(Object.assign({ players }, role));
        }
      });
      this.otherTravellers.forEach((role) => {
        const players = this.players.filter((p) => p.role.id === role.id);
        if (role.firstNight && players.length) {
          const newFirstNight = this.edition.firstNight
            ? this.edition.firstNight.indexOf("dusk") + 1.2
            : role.firstNight;
          rolesFirstNight.push(
            Object.assign({ players }, role, { firstNight: newFirstNight }),
          );
        }
      });
      this.npcs
        .filter(
          (npc) =>
            npc.firstNight ||
            (this.edition.firstNight &&
              this.edition.firstNight.includes(npc.id)),
        )
        .forEach((npc) => {
          const newFirstNight = this.edition.firstNight
            ? this.edition.firstNight.includes(npc.id)
              ? this.edition.firstNight.indexOf(npc.id) + 1
              : this.edition.firstNight.indexOf("dusk") + 1.1
            : npc.firstNight;
          rolesFirstNight.push(
            Object.assign({ players: [] }, npc, { firstNight: newFirstNight }),
          );
        });
      rolesFirstNight.sort((a, b) => a.firstNight - b.firstNight);
      return rolesFirstNight;
    },
    rolesOtherNight: function () {
      const rolesOtherNight = [];
      // add dusk and dawn to other night order sheet
      const duskIndex = this.edition.otherNight
        ? this.edition.otherNight.indexOf("dusk") + 1
        : this.getOtherNightOrder("dusk");
      const dawnIndex = this.edition.otherNight
        ? this.edition.otherNight.indexOf("dawn") + 1
        : this.getOtherNightOrder("dawn");
      if (duskIndex > 0) {
        rolesOtherNight.push({
          id: "dusk",
          name: "Dusk",
          otherNight: duskIndex,
          otherNightReminder: "Start the Night Phase.",
          players: [],
        });
      }
      if (dawnIndex > 0) {
        rolesOtherNight.push({
          id: "dawn",
          name: "Dawn",
          otherNight: dawnIndex,
          otherNightReminder: "Wait for a few seconds. End the Night Phase.",
          players: [],
        });
      }
      const adjustedRoles = new Map(this.roles);
      adjustedRoles.forEach((role) => {
        if (this.edition.otherNight) {
          const newOtherNight = this.edition.otherNight.indexOf(role.id) + 1;
          role = Object.assign({}, role, { otherNight: newOtherNight });
        }
        const players = this.players.filter((p) => p.role.id === role.id);
        if (role.otherNight && (role.team !== "traveller" || players.length)) {
          rolesOtherNight.push(Object.assign({ players }, role));
        }
      });
      this.otherTravellers.forEach((role) => {
        const players = this.players.filter((p) => p.role.id === role.id);
        if (role.otherNight && players.length) {
          const newOtherNight = this.edition.otherNight
            ? this.edition.otherNight.indexOf("dusk") + 1.2
            : role.otherNight;
          rolesOtherNight.push(
            Object.assign({ players }, role, { otherNight: newOtherNight }),
          );
        }
      });
      this.npcs
        .filter(
          (npc) =>
            npc.otherNight ||
            (this.edition.otherNight &&
              this.edition.otherNight.includes(npc.id)),
        )
        .forEach((npc) => {
          const newOtherNight = this.edition.otherNight
            ? this.edition.otherNight.includes(npc.id)
              ? this.edition.otherNight.indexOf(npc.id) + 1
              : this.edition.otherNight.indexOf("dusk") + 1.1
            : npc.otherNight;
          rolesOtherNight.push(
            Object.assign({ players: [] }, npc, { otherNight: newOtherNight }),
          );
        });
      rolesOtherNight.sort((a, b) => a.otherNight - b.otherNight);
      return rolesOtherNight;
    },
    ...mapGetters(["getImage", "getFirstNightOrder", "getOtherNightOrder"]),
    ...mapState([
      "roles",
      "otherTravellers",
      "modals",
      "edition",
      "grimoire",
      "session",
      "npcs",
    ]),
    ...mapState("players", ["players"]),
  },
  methods: {
    getNightOrderImage(role) {
      if (
        role.id === "dusk" ||
        role.id === "dawn" ||
        role.id === "minioninfo" ||
        role.id === "demoninfo"
      ) {
        return require(`../../assets/${role.id}.webp`);
      }
      return this.getImage(role, 0);
    },
    formatNightReminder(text) {
      return text
        .replace(/\*(.*?)\*/g, "<b>$1</b>")
        .replace(/:reminder:/g, '<i class="reminder-token"></i>');
    },
    setResponded(player, roleId) {
      const hasResponded = { ...player.hasResponded };
      hasResponded[roleId] = !hasResponded[roleId];
      this.$store.commit("players/update", {
        player: player,
        property: "hasResponded",
        value: hasResponded,
      });
    },
    ...mapMutations(["toggleModal"]),
  },
};
</script>

<style lang="scss" scoped>
@import "../../vars.scss";

.toggle {
  position: absolute;
  left: 20px;
  top: 15px;
  cursor: pointer;
  &:hover {
    color: red;
  }
}

@media (orientation: portrait) {
  .toggle {
    width: 20px;
    height: 15px;
  }
}

h3 {
  margin: 0 40px;
  svg {
    vertical-align: middle;
  }
  line-height: 90%;
}

h4 {
  text-transform: capitalize;
  display: flex;
  align-items: center;
  height: 20px;
  &:before,
  &:after {
    content: " ";
    width: 100%;
    height: 1px;
    border-radius: 2px;
  }
  &:before {
    margin-right: 15px;
  }
  &:after {
    margin-left: 15px;
  }
}

.storyteller small {
  display: block;
}

.fabled {
  .name {
    background: linear-gradient(90deg, $fabled, transparent 35%);
    .night .other & {
      background: linear-gradient(-90deg, $fabled, transparent 35%);
    }
  }
}
.loric {
  .name {
    background: linear-gradient(90deg, $loric, transparent 35%);
    .night .other & {
      background: linear-gradient(-90deg, $loric, transparent 35%);
    }
  }
}
.townsfolk {
  .name {
    background: linear-gradient(90deg, $townsfolk, transparent 35%);
    .night .other & {
      background: linear-gradient(-90deg, $townsfolk, transparent 35%);
    }
  }
}
.outsider {
  .name {
    background: linear-gradient(90deg, $outsider, transparent 35%);
    .night .other & {
      background: linear-gradient(-90deg, $outsider, transparent 35%);
    }
  }
}
.minion {
  .name {
    background: linear-gradient(90deg, $minion, transparent 35%);
    .night .other & {
      background: linear-gradient(-90deg, $minion, transparent 35%);
    }
  }
}
.demon {
  .name {
    background: linear-gradient(90deg, $demon, transparent 35%);
    .night .other & {
      background: linear-gradient(-90deg, $demon, transparent 35%);
    }
  }
}
ul {
  li {
    display: flex;
    width: 100%;
    margin-bottom: 3px;
    .icon {
      width: 5vh;
      background-size: 100%;
      background-position: 50%;
      background-repeat: no-repeat;
      flex-grow: 0;
      flex-shrink: 0;
      text-align: center;
      margin: -7px 2px -10px;
      &:after {
        content: " ";
        display: block;
        padding-top: 66%;
      }
    }
    .name {
      flex-grow: 0;
      flex-shrink: 0;
      width: 15%;
      text-align: right;
      font-size: 110%;
      padding: 5px;
      border-left: 1px solid rgba(255, 255, 255, 0.4);
      border-right: 1px solid rgba(255, 255, 255, 0.4);
      small {
        color: #888;
        margin-right: 5px;
        &.dead {
          text-decoration: line-through;
        }
      }
      @media (orientation: portrait) {
        font-size: 16px;
        line-height: 16px;
      }
    }
    .reminder {
      position: fixed;
      padding: 5px 10px;
      left: 50%;
      bottom: 0;
      width: 500px;
      z-index: 25;
      background: rgba(0, 0, 0, 0.75);
      border-radius: 10px;
      border: 3px solid black;
      filter: drop-shadow(0 4px 6px rgba(0, 0, 0, 0.5));
      text-align: left;
      pointer-events: none;
      opacity: 0;
      transition: opacity 200ms ease-in-out;
      margin-left: -250px;
      :deep(.reminder-token) {
        display: inline-block;
        vertical-align: middle;
        height: 20px;
        width: 20px;
        border: 1px solid black;
        border-radius: 50%;
        top: -2px;
        background: url("../../assets/reminder.webp") no-repeat 50%;
        background-size: 100%;
      }
    }
    &:hover .reminder {
      opacity: 1;
    }
  }
  &.legend {
    font-weight: bold;
    height: 20px;
    margin-top: 10px;
    li span {
      background: none;
      height: auto;
      font-family: inherit;
      font-size: inherit;
    }
    .icon:after {
      padding-top: 0;
    }
  }
}

.night {
  display: flex;
  align-items: flex-start;
  justify-content: center;
  > *:first-child {
    margin-right: 2vh;
  }
  > * {
    flex-grow: 0;
    flex-wrap: nowrap;
    flex-direction: column;
  }
  .headline {
    display: block;
    font-weight: bold;
    border-bottom: 1px solid rgba(255, 255, 255, 0.4);
    padding: 5px 10px;
    border-radius: 0;
    text-align: center;

    @media (orientation: portrait) {
      font-size: 16px;
      line-height: 16px;
    }
  }
  .name {
    flex-grow: 1;
  }
  .first {
    .name {
      border-left: 0;
    }
  }
  .other {
    li .name {
      text-align: left;
      border-right: 0;
    }
  }
}

/** hide players when town square is set to "public" **/
#townsquare.public ~ .night-reference .modal .player {
  display: none;
}
</style>
