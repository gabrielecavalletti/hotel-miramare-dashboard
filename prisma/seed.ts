import { PrismaClient } from '@prisma/client'
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3'
import bcrypt from 'bcryptjs'
import path from 'path'

// Prisma 7 requires a driver adapter for SQLite
// DATABASE_URL from .env: "file:./dev.db" (relative to project root)
const rawUrl = process.env.DATABASE_URL ?? 'file:./dev.db'
const dbFile = rawUrl.replace(/^file:/, '')
const dbPath = path.isAbsolute(dbFile)
  ? dbFile
  : path.resolve(__dirname, '..', dbFile)
const adapter = new PrismaBetterSqlite3({ url: dbPath })
const prisma = new PrismaClient({ adapter })

async function main() {
  console.log('Seeding database...')

  // Create admin user
  const adminPasswordHash = await bcrypt.hash('admin123', 10)
  const admin = await prisma.user.upsert({
    where: { email: 'admin@hotelmiramare.it' },
    update: {},
    create: {
      email: 'admin@hotelmiramare.it',
      passwordHash: adminPasswordHash,
      name: 'Marco Bianchi',
      role: 'ADMIN',
    },
  })
  console.log(`Created admin user: ${admin.email}`)

  // Create staff user
  const staffPasswordHash = await bcrypt.hash('staff123', 10)
  const staff = await prisma.user.upsert({
    where: { email: 'staff@hotelmiramare.it' },
    update: {},
    create: {
      email: 'staff@hotelmiramare.it',
      passwordHash: staffPasswordHash,
      name: 'Giulia Rossi',
      role: 'STAFF',
    },
  })
  console.log(`Created staff user: ${staff.email}`)

  // Sample calls
  const calls = [
    {
      customerName: 'Walter Bianchi',
      customerPhone: '+39 06 1234567',
      status: 'NEW' as const,
      leadQuality: 'HOT' as const,
      requestType: 'Prenotazione camera',
      checkIn: new Date('2026-07-15'),
      checkOut: new Date('2026-07-22'),
      guests: 2,
      nights: 7,
      roomType: 'Suite vista mare',
      operationalSummary: 'Cliente interessato a suite con vista mare per settimana centrale di luglio. Richiede parcheggio incluso.',
      requiredAction: 'Richiamare per confermare disponibilità suite e prezzo pacchetto.',
      notes: 'Cliente molto interessato, ha già soggiornato in passato. Chiede sconto fedeltà.',
      rawPayload: JSON.stringify({ source: 'voice-assistant', transcript: 'Vorrei prenotare una suite...' }),
    },
    {
      customerName: 'Francesca De Luca',
      customerPhone: '+39 333 9876543',
      status: 'TO_CALL_BACK' as const,
      leadQuality: 'WARM' as const,
      requestType: 'Informazioni prezzi',
      checkIn: new Date('2026-08-10'),
      checkOut: new Date('2026-08-17'),
      guests: 4,
      nights: 7,
      roomType: 'Camera familiare',
      operationalSummary: 'Famiglia con 2 bambini cerca camera familiare agosto. Budget medio-alto.',
      requiredAction: 'Inviare preventivo camera familiare con mezza pensione.',
      notes: 'Cerca disponibilità per 2 adulti + 2 bambini (6 e 9 anni).',
      rawPayload: JSON.stringify({ source: 'voice-assistant' }),
      assignedToId: staff.id,
    },
    {
      customerName: 'Giovanni Esposito',
      customerPhone: '+39 347 1122334',
      status: 'IN_PROGRESS' as const,
      leadQuality: 'HOT' as const,
      requestType: 'Anniversario di matrimonio',
      checkIn: new Date('2026-06-20'),
      checkOut: new Date('2026-06-23'),
      guests: 2,
      nights: 3,
      roomType: 'Camera deluxe con jacuzzi',
      operationalSummary: 'Coppia per anniversario, interesse camera deluxe con jacuzzi. Richiede sorpresa romantica.',
      requiredAction: 'Preparare pacchetto romantico con cena e decorazioni.',
      notes: 'Vogliono sorpresa per il 25° anniversario. Disponibile fino alle 18:00.',
      rawPayload: JSON.stringify({ source: 'voice-assistant' }),
      assignedToId: admin.id,
    },
    {
      customerName: 'Maria Colombo',
      customerPhone: '+39 02 8899001',
      status: 'CONFIRMED' as const,
      leadQuality: 'WARM' as const,
      requestType: 'Prenotazione confermata',
      checkIn: new Date('2026-05-30'),
      checkOut: new Date('2026-06-02'),
      guests: 2,
      nights: 3,
      roomType: 'Camera standard',
      operationalSummary: 'Prenotazione confermata per long weekend.',
      requiredAction: null,
      notes: 'Pagamento caparra ricevuta. Trasferimento da Roma previsto venerdì pomeriggio.',
      rawPayload: JSON.stringify({ source: 'voice-assistant' }),
      assignedToId: staff.id,
    },
    {
      customerName: 'Roberto Ferri',
      customerPhone: '+39 320 5544332',
      status: 'NEW' as const,
      leadQuality: 'COLD' as const,
      requestType: 'Richiesta generica',
      checkIn: null,
      checkOut: null,
      guests: 1,
      nights: null,
      roomType: null,
      operationalSummary: 'Cliente chiede informazioni generiche su servizi hotel.',
      requiredAction: 'Inviare brochure via email.',
      notes: 'Non ha ancora date precise. Possibile viaggio di lavoro autunno.',
      rawPayload: JSON.stringify({ source: 'voice-assistant' }),
    },
  ]

  for (const callData of calls) {
    const call = await prisma.call.create({ data: callData })
    console.log(`Created call: ${call.customerName} (${call.status})`)
  }

  console.log('\nSeed completed!')
  console.log('Login credentials:')
  console.log('  Admin: admin@hotelmiramare.it / admin123')
  console.log('  Staff: staff@hotelmiramare.it / staff123')
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })
