import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getUserId } from '@/lib/auth'

async function checkAdmin(request: NextRequest) {
  const userId = await getUserId(request)
  if (!userId) return { error: 'No autenticado', status: 401 }
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { rol: true } })
  if (user?.rol !== 'Administrador') return { error: 'No autorizado', status: 403 }
  return { error: null }
}

export async function GET() {
  try {
    const valores = await prisma.valores.findMany({ 
      include: {
        enfoqueValores: {
          include: {
            enfoque: true
          }
        }
      },
      orderBy: { idvalor: 'asc' } 
    })
    return NextResponse.json({ valores })
  } catch (error) {
    return NextResponse.json({ error: 'Error al obtener valores' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const check = await checkAdmin(request)
    if (check.error) return NextResponse.json({ error: check.error }, { status: check.status })

    const { descripcion, actitud, idenfoques } = await request.json()
    if (!descripcion || !actitud) {
      return NextResponse.json({ error: 'Descripción y actitud son requeridos' }, { status: 400 })
    }

    // Convertir idenfoques a array si viene como string o número
    let enfoquesArray: number[] = []
    if (idenfoques) {
      if (typeof idenfoques === 'string') {
        enfoquesArray = idenfoques.split(',').map((id: string) => parseInt(id.trim())).filter((id: number) => !isNaN(id))
      } else if (Array.isArray(idenfoques)) {
        enfoquesArray = idenfoques.map((id: any) => parseInt(id)).filter((id: number) => !isNaN(id))
      } else if (typeof idenfoques === 'number') {
        enfoquesArray = [idenfoques]
      }
    }

    const valor = await prisma.$transaction(async (tx) => {
      // Crear el valor
      const nuevoValor = await tx.valores.create({ 
        data: { 
          descripcion, 
          actitud
        } 
      })

      // Crear las relaciones en enfo_val si hay enfoques seleccionados
      if (enfoquesArray.length > 0) {
        // Usar create individual para evitar problemas con IDs autoincrementales
        for (const idenfoque of enfoquesArray) {
          await tx.enfoVal.create({
            data: {
              idenfoque,
              idvalor: nuevoValor.idvalor
            }
          })
        }
      }

      // Retornar el valor con sus relaciones
      return await tx.valores.findUnique({
        where: { idvalor: nuevoValor.idvalor },
        include: {
          enfoqueValores: {
            include: {
              enfoque: true
            }
          }
        }
      })
    })

    return NextResponse.json({ message: 'Valor creado exitosamente', valor })
  } catch (error: any) {
    console.error('Error al crear valor:', error)
    return NextResponse.json({ error: 'Error al crear valor' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const check = await checkAdmin(request)
    if (check.error) return NextResponse.json({ error: check.error }, { status: check.status })

    const { idvalor, descripcion, actitud, idenfoques } = await request.json()
    if (!idvalor || !descripcion || !actitud) {
      return NextResponse.json({ error: 'ID, descripción y actitud son requeridos' }, { status: 400 })
    }

    // Convertir idenfoques a array si viene como string o número
    let enfoquesArray: number[] = []
    if (idenfoques) {
      if (typeof idenfoques === 'string') {
        enfoquesArray = idenfoques.split(',').map((id: string) => parseInt(id.trim())).filter((id: number) => !isNaN(id))
      } else if (Array.isArray(idenfoques)) {
        enfoquesArray = idenfoques.map((id: any) => parseInt(id)).filter((id: number) => !isNaN(id))
      } else if (typeof idenfoques === 'number') {
        enfoquesArray = [idenfoques]
      }
    }

    const valor = await prisma.$transaction(async (tx) => {
      // Actualizar el valor
      await tx.valores.update({
        where: { idvalor: parseInt(idvalor) },
        data: { 
          descripcion, 
          actitud
        }
      })

      // Eliminar todas las relaciones existentes
      await tx.enfoVal.deleteMany({
        where: { idvalor: parseInt(idvalor) }
      })

      // Resetear la secuencia de autoincrement para evitar conflictos
      // Solo si hay registros para crear
      if (enfoquesArray.length > 0) {
        // Obtener el máximo ID actual para resetear la secuencia
        const maxIdResult = await tx.$queryRaw<[{ max: bigint | null }]>`
          SELECT MAX(idenfoval) as max FROM enfo_val
        `
        const maxId = maxIdResult[0]?.max ? Number(maxIdResult[0].max) : 0
        
        // Resetear la secuencia al siguiente ID disponible
        await tx.$executeRaw`
          SELECT setval('enfo_val_idenfoval_seq', ${maxId}, true)
        `
      }

      // Crear las nuevas relaciones si hay enfoques seleccionados
      if (enfoquesArray.length > 0) {
        // Crear las relaciones secuencialmente para evitar conflictos con IDs autoincrementales
        for (const idenfoque of enfoquesArray) {
          // Verificar primero si ya existe la relación antes de crearla
          const existe = await tx.enfoVal.findFirst({
            where: {
              idenfoque,
              idvalor: parseInt(idvalor)
            }
          })
          
          // Solo crear si no existe
          if (!existe) {
            try {
              await tx.enfoVal.create({
                data: {
                  idenfoque,
                  idvalor: parseInt(idvalor)
                }
              })
            } catch (error: any) {
              // Si el error es por duplicado o por restricción única, ignorarlo
              if (error.code !== 'P2002' && error.code !== 'P2003') {
                console.error('Error al crear relación enfo_val:', error)
                throw error
              }
            }
          }
        }
      }

      // Retornar el valor actualizado con sus relaciones
      return await tx.valores.findUnique({
        where: { idvalor: parseInt(idvalor) },
        include: {
          enfoqueValores: {
            include: {
              enfoque: true
            }
          }
        }
      })
    })

    return NextResponse.json({ message: 'Valor actualizado exitosamente', valor })
  } catch (error) {
    console.error('Error al actualizar valor:', error)
    return NextResponse.json({ error: 'Error al actualizar valor' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const check = await checkAdmin(request)
    if (check.error) return NextResponse.json({ error: check.error }, { status: check.status })

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'ID es requerido' }, { status: 400 })

    await prisma.valores.delete({ where: { idvalor: parseInt(id) } })
    return NextResponse.json({ message: 'Valor eliminado exitosamente' })
  } catch (error: any) {
    if (error.code === 'P2003') {
      return NextResponse.json({ error: 'No se puede eliminar porque tiene relaciones asociadas' }, { status: 400 })
    }
    return NextResponse.json({ error: 'Error al eliminar valor' }, { status: 500 })
  }
}

