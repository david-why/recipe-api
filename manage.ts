import { password, sql } from "bun"

const args = process.argv.slice(2)

if (args.length === 0) {
  console.error("Usage: manage.ts <command> [args]")
  process.exit(1)
}

const command = args.shift()!

const commands = {
  adduser: async () => {
    const hash = await password.hash(args[1])
    const flags = Number(args[2] || 0)
    await sql`INSERT INTO users (username, password_hash, flags) VALUES (${args[0]}, ${hash}, ${flags})`
  },
}

if (command in commands) {
  await commands[command]()
} else {
  console.error(`Unknown command: ${command}`)
}
