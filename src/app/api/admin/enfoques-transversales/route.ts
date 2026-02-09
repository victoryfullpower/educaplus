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
    const enfoques = await prisma.enfoqueTransversal.findMany({ 
      include: {
        enfoqueValores: {
          include: {
            valor: true
          }
        }
      },
      orderBy: { idenfoque: 'asc' } 
    })
    return NextResponse.json({ enfoques })
  } catch (error) {
    return NextResponse.json({ error: 'Error al obtener enfoques transversales' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const check = await checkAdmin(request)
    if (check.error) return NextResponse.json({ error: check.error }, { status: check.status })

    const { descripcion, idnivel, idgrado, idvalores } = await request.json()
    if (!descripcion || !idnivel || !idgrado) {
      return NextResponse.json({ error: 'Descripción, ID de nivel e ID de grado son requeridos' }, { status: 400 })
    }

    // Convertir idvalores a array si viene como string o número
    let valoresArray: number[] = []
    if (idvalores) {
      if (typeof idvalores === 'string') {
        valoresArray = idvalores.split(',').map((id: string) => parseInt(id.trim())).filter((id: number) => !isNaN(id))
      } else if (Array.isArray(idvalores)) {
        valoresArray = idvalores.map((id: any) => parseInt(id)).filter((id: number) => !isNaN(id))
      } else if (typeof idvalores === 'number') {
        valoresArray = [idvalores]
      }
    }

    const enfoque = await prisma.$transaction(async (tx) => {
      // Crear el enfoque transversal
      const nuevoEnfoque = await tx.enfoqueTransversal.create({ 
        data: { 
          descripcion,
          idnivel: String(idnivel),
          idgrado: String(idgrado)
        } 
      })

      // Crear las relaciones en enfo_val si hay valores seleccionados
      if (valoresArray.length > 0) {
        // Usar create individual para evitar problemas con IDs autoincrementales
        for (const idvalor of valoresArray) {
          await tx.enfoVal.create({
            data: {
              idenfoque: nuevoEnfoque.idenfoque,
              idvalor
            }
          })
        }
      }

      // Retornar el enfoque con sus relaciones
      return await tx.enfoqueTransversal.findUnique({
        where: { idenfoque: nuevoEnfoque.idenfoque },
        include: {
          enfoqueValores: {
            include: {
              valor: true
            }
          }
        }
      })
    })

    return NextResponse.json({ message: 'Enfoque transversal creado exitosamente', enfoque })
  } catch (error: any) {
    console.error('Error al crear enfoque transversal:', error)
    return NextResponse.json({ error: 'Error al crear enfoque transversal' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const check = await checkAdmin(request)
    if (check.error) return NextResponse.json({ error: check.error }, { status: check.status })

    const { idenfoque, descripcion, idnivel, idgrado, idvalores } = await request.json()
    if (!idenfoque || !descripcion || !idnivel || !idgrado) {
      return NextResponse.json({ error: 'ID, descripción, ID de nivel e ID de grado son requeridos' }, { status: 400 })
    }

    // Convertir idvalores a array si viene como string o número
    let valoresArray: number[] = []
    if (idvalores) {
      if (typeof idvalores === 'string') {
        valoresArray = idvalores.split(',').map((id: string) => parseInt(id.trim())).filter((id: number) => !isNaN(id))
      } else if (Array.isArray(idvalores)) {
        valoresArray = idvalores.map((id: any) => parseInt(id)).filter((id: number) => !isNaN(id))
      } else if (typeof idvalores === 'number') {
        valoresArray = [idvalores]
      }
    }

    const enfoque = await prisma.$transaction(async (tx) => {
      // Actualizar el enfoque transversal
      await tx.enfoqueTransversal.update({
        where: { idenfoque: parseInt(idenfoque) },
        data: { 
          descripcion, 
          idnivel: String(idnivel),
          idgrado: String(idgrado)
        }
      })

      // Eliminar todas las relaciones existentes en enfo_val
      await tx.enfoVal.deleteMany({
        where: { idenfoque: parseInt(idenfoque) }
      })

      // Resetear la secuencia de autoincrement para evitar conflictos
      // Solo si hay registros para crear
      if (valoresArray.length > 0) {
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

      // Crear las nuevas relaciones si hay valores seleccionados
      if (valoresArray.length > 0) {
        // Crear las relaciones secuencialmente para evitar conflictos con IDs autoincrementales
        for (const idvalor of valoresArray) {
          // Verificar primero si ya existe la relación antes de crearla
          const existe = await tx.enfoVal.findFirst({
            where: {
              idenfoque: parseInt(idenfoque),
              idvalor
            }
          })
          
          // Solo crear si no existe
          if (!existe) {
            try {
              await tx.enfoVal.create({
                data: {
                  idenfoque: parseInt(idenfoque),
                  idvalor
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

      // Retornar el enfoque actualizado con sus relaciones
      return await tx.enfoqueTransversal.findUnique({
        where: { idenfoque: parseInt(idenfoque) },
        include: {
          enfoqueValores: {
            include: {
              valor: true
            }
          }
        }
      })
    })

    return NextResponse.json({ message: 'Enfoque transversal actualizado exitosamente', enfoque })
  } catch (error) {
    console.error('Error al actualizar enfoque transversal:', error)
    return NextResponse.json({ error: 'Error al actualizar enfoque transversal' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const check = await checkAdmin(request)
    if (check.error) return NextResponse.json({ error: check.error }, { status: check.status })

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'ID es requerido' }, { status: 400 })

    await prisma.enfoqueTransversal.delete({ where: { idenfoque: parseInt(id) } })
    return NextResponse.json({ message: 'Enfoque transversal eliminado exitosamente' })
  } catch (error: any) {
    if (error.code === 'P2003') {
      return NextResponse.json({ error: 'No se puede eliminar porque tiene relaciones asociadas' }, { status: 400 })
    }
    return NextResponse.json({ error: 'Error al eliminar enfoque transversal' }, { status: 500 })
  }
}

