// Datos de Ubigeo del Perú - Departamentos, Provincias y Distritos

export interface UbigeoData {
  departamento: string
  provincias: {
    provincia: string
    distritos: string[]
  }[]
}

export const UBIGEOS_PERU: UbigeoData[] = [
  {
    departamento: 'Amazonas',
    provincias: [
      {
        provincia: 'Chachapoyas',
        distritos: ['Chachapoyas', 'Asunción', 'Balsas', 'Cheto', 'Chiliquin', 'Chuquibamba', 'Granada', 'Huancas', 'La Jalca', 'Leimebamba', 'Levanto', 'Magdalena', 'Mariscal Castilla', 'Molinopampa', 'Montevideo', 'Olleros', 'Quinjalca', 'San Francisco de Daguas', 'San Isidro de Maino', 'Soloco', 'Sonche']
      },
      {
        provincia: 'Bagua',
        distritos: ['Bagua', 'Aramango', 'Copallin', 'El Parco', 'Imaza', 'La Peca']
      },
      {
        provincia: 'Bongará',
        distritos: ['Jumbilla', 'Chisquilla', 'Churuja', 'Corosha', 'Cuispes', 'Florida', 'Jazán', 'Recta', 'San Carlos', 'Shipasbamba', 'Valera', 'Yambrasbamba']
      }
    ]
  },
  {
    departamento: 'Áncash',
    provincias: [
      {
        provincia: 'Huaraz',
        distritos: ['Huaraz', 'Cochabamba', 'Colcabamba', 'Huanchay', 'Independencia', 'Jangas', 'La Libertad', 'Olleros', 'Pampas Grande', 'Pariacoto', 'Pira', 'Tarica']
      },
      {
        provincia: 'Aija',
        distritos: ['Aija', 'Coris', 'Huacllán', 'La Merced', 'Succha']
      },
      {
        provincia: 'Antonio Raymondi',
        distritos: ['Llamellín', 'Aczo', 'Chaccho', 'Chingas', 'Mirgas', 'San Juan de Rontoy']
      },
      {
        provincia: 'Asunción',
        distritos: ['Chacas', 'Acochaca']
      },
      {
        provincia: 'Bolognesi',
        distritos: ['Chiquián', 'Abelardo Pardo Lezameta', 'Antonio Raymondi', 'Aquia', 'Cajacay', 'Canis', 'Colquioc', 'Huallanca', 'Huasta', 'Huayllacayán', 'La Primavera', 'Mangas', 'Pacllón', 'San Miguel de Corpanqui', 'Ticllos']
      },
      {
        provincia: 'Carhuaz',
        distritos: ['Carhuaz', 'Acopampa', 'Amashca', 'Anta', 'Ataquero', 'Marcará', 'Pariahuanca', 'San Miguel de Aco', 'Shilla', 'Tinco', 'Yungar']
      },
      {
        provincia: 'Carlos Fermín Fitzcarrald',
        distritos: ['San Luis', 'San Nicolás', 'Yauya']
      },
      {
        provincia: 'Casma',
        distritos: ['Casma', 'Buena Vista Alta', 'Comandante Noel', 'Yautan']
      },
      {
        provincia: 'Corongo',
        distritos: ['Corongo', 'Aco', 'Bambas', 'Cusca', 'La Pampa', 'Yanac', 'Yupan']
      },
      {
        provincia: 'Huari',
        distritos: ['Huari', 'Anra', 'Cajay', 'Chavín de Huántar', 'Huacachi', 'Huacchis', 'Huachis', 'Huantar', 'Masin', 'Paucas', 'Ponto', 'Rahuapampa', 'Rapayán', 'San Marcos', 'San Pedro de Chana', 'Uco']
      },
      {
        provincia: 'Huarmey',
        distritos: ['Huarmey', 'Cochapeti', 'Culebras', 'Huayan', 'Malvas']
      },
      {
        provincia: 'Huaylas',
        distritos: ['Caraz', 'Huallanca', 'Huata', 'Huaylas', 'Mato', 'Pamparomas', 'Pueblo Libre', 'Santa Cruz', 'Santo Toribio', 'Yuracmarca']
      },
      {
        provincia: 'Mariscal Luzuriaga',
        distritos: ['Piscobamba', 'Casca', 'Eleazar Guzmán Barrón', 'Fidel Olivas Escudero', 'Llama', 'Llumpa', 'Lucma', 'Musga']
      },
      {
        provincia: 'Ocros',
        distritos: ['Ocros', 'Acas', 'Cajamarquilla', 'Carhuapampa', 'Cochas', 'Congas', 'Llipa', 'San Cristóbal de Rajan', 'San Pedro', 'Santiago de Chilcas']
      },
      {
        provincia: 'Pallasca',
        distritos: ['Cabana', 'Bolognesi', 'Conchucos', 'Huacaschuque', 'Huandoval', 'Lacabamba', 'Llapo', 'Pallasca', 'Pampas', 'Santa Rosa', 'Tauca']
      },
      {
        provincia: 'Pomabamba',
        distritos: ['Pomabamba', 'Huayllán', 'Parobamba', 'Quinuabamba']
      },
      {
        provincia: 'Recuay',
        distritos: ['Recuay', 'Catac', 'Cotaparaco', 'Huayllapampa', 'Llacllín', 'Marca', 'Pampas Chico', 'Pararin', 'Tapacocha', 'Ticapampa']
      },
      {
        provincia: 'Santa',
        distritos: ['Chimbote', 'Cáceres del Perú', 'Coishco', 'Macate', 'Moro', 'Nepeña', 'Samanco', 'Santa', 'Nuevo Chimbote']
      },
      {
        provincia: 'Sihuas',
        distritos: ['Sihuas', 'Acobamba', 'Alfonso Ugarte', 'Cashapampa', 'Chingalpo', 'Huayllabamba', 'Quiches', 'Ragash', 'San Juan', 'Sicsibamba']
      },
      {
        provincia: 'Yungay',
        distritos: ['Yungay', 'Cascapara', 'Mancos', 'Matacoto', 'Quillo', 'Ranrahirca', 'Shupluy', 'Yanama']
      }
    ]
  },
  {
    departamento: 'Apurímac',
    provincias: [
      {
        provincia: 'Abancay',
        distritos: ['Abancay', 'Chacoche', 'Circa', 'Curahuasi', 'Huanipaca', 'Lambrama', 'Pichirhua', 'San Pedro de Cachora', 'Tamburco']
      },
      {
        provincia: 'Andahuaylas',
        distritos: ['Andahuaylas', 'Andarapa', 'Chiara', 'Huancarama', 'Huancaray', 'Huayana', 'Kishuara', 'Pacobamba', 'Pacucha', 'Pampachiri', 'Pomacocha', 'San Antonio de Cachi', 'San Jerónimo', 'San Miguel de Chaccrapampa', 'Santa María de Chicmo', 'Talavera', 'Tumay Huaraca', 'Turpo']
      },
      {
        provincia: 'Antabamba',
        distritos: ['Antabamba', 'El Oro', 'Huaquirca', 'Juan Espinoza Medrano', 'Oropesa', 'Pachaconas', 'Sabaino']
      },
      {
        provincia: 'Aymaraes',
        distritos: ['Chalhuanca', 'Capaya', 'Caraybamba', 'Chapimarca', 'Colcabamba', 'Cotaruse', 'Huayllo', 'Justo Apu Sahuaraura', 'Lucre', 'Pocohuanca', 'San Juan de Chacña', 'Sañayca', 'Soraya', 'Tapairihua', 'Tintay', 'Toraya', 'Yanaca']
      },
      {
        provincia: 'Cotabambas',
        distritos: ['Tambobamba', 'Cotabambas', 'Coyllurqui', 'Haquira', 'Mara', 'Challhuahuacho']
      },
      {
        provincia: 'Chincheros',
        distritos: ['Chincheros', 'Anco_Huallo', 'Cocharcas', 'Huaccana', 'Ocobamba', 'Ongoy', 'Uranmarca', 'Ranracancha', 'Rocchacc', 'El Porvenir', 'Los Chankas']
      },
      {
        provincia: 'Grau',
        distritos: ['Chuquibambilla', 'Curpahuasi', 'Gamarra', 'Huayllati', 'Mamara', 'Micaela Bastidas', 'Pataypampa', 'Progreso', 'San Antonio', 'Santa Rosa', 'Turpay', 'Vilcabamba', 'Virundo', 'Curasco']
      }
    ]
  },
  {
    departamento: 'Arequipa',
    provincias: [
      {
        provincia: 'Arequipa',
        distritos: ['Arequipa', 'Alto Selva Alegre', 'Cayma', 'Cerro Colorado', 'Characato', 'Chiguata', 'Jacobo Hunter', 'La Joya', 'Mariano Melgar', 'Miraflores', 'Mollebaya', 'Paucarpata', 'Pocsi', 'Polobaya', 'Quequeña', 'Sabandía', 'Sachaca', 'San Juan de Siguas', 'San Juan de Tarucani', 'Santa Isabel de Siguas', 'Santa Rita de Siguas', 'Socabaya', 'Tiabaya', 'Uchumayo', 'Vitor', 'Yanahuara', 'Yarabamba', 'Yura', 'José Luis Bustamante y Rivero']
      },
      {
        provincia: 'Camaná',
        distritos: ['Camaná', 'José María Quimper', 'Mariano Nicolás Valcárcel', 'Mariscal Cáceres', 'Nicolás de Pierola', 'Ocoña', 'Quilca', 'Samuel Pastor']
      },
      {
        provincia: 'Caravelí',
        distritos: ['Caravelí', 'Acarí', 'Atico', 'Atiquipa', 'Bella Unión', 'Cahuacho', 'Chala', 'Chaparra', 'Huanuhuanu', 'Jaqui', 'Lomas', 'Quicacha', 'Yauca']
      },
      {
        provincia: 'Castilla',
        distritos: ['Aplao', 'Andagua', 'Ayo', 'Chachas', 'Chilcaymarca', 'Choco', 'Huancarqui', 'Machaguay', 'Orcopampa', 'Pampacolca', 'Tipan', 'Uñon', 'Uraca', 'Viraco']
      },
      {
        provincia: 'Caylloma',
        distritos: ['Chivay', 'Achoma', 'Cabanaconde', 'Callalli', 'Caylloma', 'Coporaque', 'Huambo', 'Huanca', 'Ichupampa', 'Lari', 'Lluta', 'Maca', 'Madrigal', 'San Antonio de Chuca', 'Sibayo', 'Tapay', 'Tisco', 'Tuti', 'Yanque']
      },
      {
        provincia: 'Condesuyos',
        distritos: ['Chuquibamba', 'Andaray', 'Cayarani', 'Chichas', 'Iray', 'Río Grande', 'Salamanca', 'Yanaquihua']
      },
      {
        provincia: 'Islay',
        distritos: ['Mollendo', 'Cocachacra', 'Dean Valdivia', 'Islay', 'Mejía', 'Punta de Bombón']
      },
      {
        provincia: 'La Unión',
        distritos: ['Cotahuasi', 'Alca', 'Charcana', 'Huaynacotas', 'Pampamarca', 'Puyca', 'Quechualla', 'Sayla', 'Tauria', 'Tomepampa', 'Toro']
      }
    ]
  },
  {
    departamento: 'Ayacucho',
    provincias: [
      {
        provincia: 'Huamanga',
        distritos: ['Ayacucho', 'Acos Vinchos', 'Carmen Alto', 'Chiara', 'Ocros', 'Pacaycasa', 'Quinua', 'San José de Ticllas', 'San Juan Bautista', 'Santiago de Pischa', 'Socos', 'Tambillo', 'Vinchos', 'Jesús Nazareno', 'Andrés Avelino Cáceres Dorregaray']
      },
      {
        provincia: 'Cangallo',
        distritos: ['Cangallo', 'Chuschi', 'Los Morochucos', 'María Parado de Bellido', 'Paras', 'Totos']
      },
      {
        provincia: 'Huanca Sancos',
        distritos: ['Sancos', 'Carapo', 'Sacsamarca', 'Santiago de Lucanamarca']
      },
      {
        provincia: 'Huanta',
        distritos: ['Huanta', 'Ayahuanco', 'Huamanguilla', 'Iguain', 'Luricocha', 'Santillana', 'Sivia', 'Llochegua', 'Canayre', 'Uchuraccay', 'Pucacolpa', 'Chaca']
      },
      {
        provincia: 'La Mar',
        distritos: ['San Miguel', 'Anco', 'Ayna', 'Chilcas', 'Chungui', 'Luis Carranza', 'Santa Rosa', 'Tambo', 'Samugari', 'Anchihuay', 'Oronccoy']
      },
      {
        provincia: 'Lucanas',
        distritos: ['Puquio', 'Aucara', 'Cabana', 'Carmen Salcedo', 'Chaviña', 'Chipao', 'Huac-Huas', 'Laramate', 'Leoncio Prado', 'Llauta', 'Lucanas', 'Ocaña', 'Otoca', 'Saisa', 'San Cristóbal', 'San Juan', 'San Pedro', 'San Pedro de Palco', 'Sancos', 'Santa Ana de Huaycahuacho', 'Santa Lucia']
      },
      {
        provincia: 'Parinacochas',
        distritos: ['Coracora', 'Chumpi', 'Coronel Castañeda', 'Pacapausa', 'Pullo', 'Puyusca', 'San Francisco de Ravacayco', 'Upahuacho']
      },
      {
        provincia: 'Páucar del Sara Sara',
        distritos: ['Pausa', 'Colta', 'Corculla', 'Lampa', 'Marcabamba', 'Oyolo', 'Pararca', 'San Javier de Alpabamba', 'San José de Ushua', 'Sara Sara']
      },
      {
        provincia: 'Sucre',
        distritos: ['Querobamba', 'Belén', 'Chalcos', 'Chilcayoc', 'Huacaña', 'Morcolla', 'Paico', 'San Pedro de Larcay', 'San Salvador de Quije', 'Santiago de Paucaray', 'Soras']
      },
      {
        provincia: 'Víctor Fajardo',
        distritos: ['Huancapi', 'Alcamenca', 'Apongo', 'Asquipata', 'Canaria', 'Cayara', 'Colca', 'Huamanquiquia', 'Huancaraylla', 'Hualla', 'Sarhua', 'Vilcanchos']
      },
      {
        provincia: 'Vilcas Huamán',
        distritos: ['Vilcas Huamán', 'Accomarca', 'Carhuanca', 'Concepción', 'Huambalpa', 'Independencia', 'Saurama', 'Vischongo']
      }
    ]
  },
  {
    departamento: 'Cajamarca',
    provincias: [
      {
        provincia: 'Cajamarca',
        distritos: ['Cajamarca', 'Asunción', 'Chetilla', 'Cospan', 'Encañada', 'Jesús', 'Llacanora', 'Los Baños del Inca', 'Magdalena', 'Matara', 'Namora', 'San Juan', 'San Pablo']
      },
      {
        provincia: 'Cajabamba',
        distritos: ['Cajabamba', 'Cachachi', 'Condebamba', 'Sitacocha']
      },
      {
        provincia: 'Celendín',
        distritos: ['Celendín', 'Chumuch', 'Cortegana', 'Huasmin', 'Jorge Chávez', 'José Gálvez', 'Miguel Iglesias', 'Oxamarca', 'Sorochuco', 'Sucre', 'Utco', 'La Libertad de Pallan']
      },
      {
        provincia: 'Chota',
        distritos: ['Chota', 'Anguia', 'Chadin', 'Chiguirip', 'Chimban', 'Choropampa', 'Cochabamba', 'Conchan', 'Huambos', 'Lajas', 'Llama', 'Miracosta', 'Paccha', 'Pion', 'Querocoto', 'San Juan de Licupis', 'Tacabamba', 'Tocmoche', 'Chalamarca']
      },
      {
        provincia: 'Contumazá',
        distritos: ['Contumazá', 'Chilete', 'Cupisnique', 'Guzmango', 'San Benito', 'Santa Cruz de Toledo', 'Tantarica', 'Yonán']
      },
      {
        provincia: 'Cutervo',
        distritos: ['Cutervo', 'Callayuc', 'Choros', 'Cujillo', 'La Ramada', 'Pimpingos', 'Querocotillo', 'San Andrés de Cutervo', 'San Juan de Cutervo', 'San Luis de Lucma', 'Santa Cruz', 'Santa Cruz de Succhabamba', 'Santo Domingo de la Capilla', 'Santo Tomas', 'Socota', 'Toribio Casanova']
      },
      {
        provincia: 'Hualgayoc',
        distritos: ['Bambamarca', 'Chugur', 'Hualgayoc']
      },
      {
        provincia: 'Jaén',
        distritos: ['Jaén', 'Bellavista', 'Chontali', 'Colasay', 'Huabal', 'Las Pirias', 'Pomahuaca', 'Pucara', 'Sallique', 'San Felipe', 'San José del Alto', 'Santa Rosa']
      },
      {
        provincia: 'San Ignacio',
        distritos: ['San Ignacio', 'Chirinos', 'Huarango', 'La Coipa', 'Namballe', 'San José de Lourdes', 'Tabaconas']
      },
      {
        provincia: 'San Marcos',
        distritos: ['Pedro Gálvez', 'Chancay', 'Eduardo Villanueva', 'Gregorio Pita', 'Ichocan', 'José Manuel Quiroz', 'José Sabogal', 'Pedro Gálvez']
      },
      {
        provincia: 'San Miguel',
        distritos: ['San Miguel de Pallaques', 'Bolívar', 'Calquis', 'Catilluc', 'El Prado', 'La Florida', 'Llapa', 'Nanchoc', 'Niepos', 'San Gregorio', 'San Silvestre de Cochan', 'Tongod', 'Unión Agua Blanca']
      },
      {
        provincia: 'San Pablo',
        distritos: ['San Pablo', 'San Bernardino', 'San Luis', 'Tumbaden']
      },
      {
        provincia: 'Santa Cruz',
        distritos: ['Santa Cruz', 'Andabamba', 'Catache', 'Chancaybaños', 'La Esperanza', 'Ninabamba', 'Pulan', 'Saucepampa', 'Sitacocha']
      }
    ]
  },
  {
    departamento: 'Callao',
    provincias: [
      {
        provincia: 'Callao',
        distritos: ['Callao', 'Bellavista', 'Carmen de la Legua Reynoso', 'La Perla', 'La Punta', 'Ventanilla', 'Mi Perú']
      }
    ]
  },
  {
    departamento: 'Cusco',
    provincias: [
      {
        provincia: 'Cusco',
        distritos: ['Cusco', 'Ccorca', 'Poroy', 'San Jerónimo', 'San Sebastian', 'Santiago', 'Saylla', 'Wanchaq']
      },
      {
        provincia: 'Acomayo',
        distritos: ['Acomayo', 'Acopia', 'Acos', 'Mosoc Llacta', 'Pomacanchi', 'Rondocan', 'Sangarara']
      },
      {
        provincia: 'Anta',
        distritos: ['Anta', 'Ancahuasi', 'Cachimayo', 'Chinchaypujio', 'Huarocondo', 'Limatambo', 'Mollepata', 'Pucyura', 'Zurite']
      },
      {
        provincia: 'Calca',
        distritos: ['Calca', 'Coya', 'Lamay', 'Lares', 'Pisac', 'San Salvador', 'Taray', 'Yanatile']
      },
      {
        provincia: 'Canas',
        distritos: ['Yanaoca', 'Checca', 'Kunturkanki', 'Langui', 'Layo', 'Pampamarca', 'Quehue', 'Tupac Amaru']
      },
      {
        provincia: 'Canchis',
        distritos: ['Sicuani', 'Checacupe', 'Combapata', 'Marangani', 'Pitumarca', 'San Pablo', 'San Pedro', 'Tinta']
      },
      {
        provincia: 'Chumbivilcas',
        distritos: ['Santo Tomas', 'Capacmarca', 'Chamaca', 'Colquemarca', 'Livitaca', 'Llusco', 'Quiñota', 'Velille']
      },
      {
        provincia: 'Espinar',
        distritos: ['Yauri', 'Condoroma', 'Coporaque', 'Ocoruro', 'Pallpata', 'Pichigua', 'Suyckutambo', 'Alto Pichigua']
      },
      {
        provincia: 'La Convención',
        distritos: ['Santa Ana', 'Echarate', 'Huayopata', 'Maranura', 'Ocobamba', 'Quellouno', 'Kimbiri', 'Pichari', 'Villa Virgen', 'Villa Kintiarina', 'Megantoni']
      },
      {
        provincia: 'Paruro',
        distritos: ['Paruro', 'Accha', 'Ccapi', 'Colcha', 'Huanoquite', 'Omacha', 'Paccaritambo', 'Pillpinto', 'Yaurisque']
      },
      {
        provincia: 'Paucartambo',
        distritos: ['Paucartambo', 'Caicay', 'Challabamba', 'Colquepata', 'Huancarani', 'Kosñipata']
      },
      {
        provincia: 'Quispicanchi',
        distritos: ['Urcos', 'Andahuaylillas', 'Camanti', 'Ccarhuayo', 'Ccatca', 'Cusipata', 'Huaro', 'Lucre', 'Marcapata', 'Ocongate', 'Oropesa', 'Quiquijana']
      },
      {
        provincia: 'Urubamba',
        distritos: ['Urubamba', 'Chinchero', 'Huayllabamba', 'Machupicchu', 'Maras', 'Ollantaytambo', 'Yucay']
      }
    ]
  },
  {
    departamento: 'Huancavelica',
    provincias: [
      {
        provincia: 'Huancavelica',
        distritos: ['Huancavelica', 'Acobambilla', 'Acoria', 'Conayca', 'Cuenca', 'Huachocolpa', 'Huayllahuara', 'Izcuchaca', 'Laria', 'Manta', 'Mariscal Cáceres', 'Moya', 'Nuevo Occoro', 'Palca', 'Pilchaca', 'Vilca', 'Yauli', 'Ascensión', 'Huando']
      },
      {
        provincia: 'Acobamba',
        distritos: ['Acobamba', 'Andabamba', 'Anta', 'Caja', 'Marcas', 'Paucara', 'Pomacocha', 'Rosario']
      },
      {
        provincia: 'Angaraes',
        distritos: ['Lircay', 'Anchonga', 'Callanmarca', 'Ccochaccasa', 'Chincho', 'Congalla', 'Huanca-Huanca', 'Huayllay Grande', 'Julcamarca', 'San Antonio de Antaparco', 'Santo Tomas de Pata', 'Secclla']
      },
      {
        provincia: 'Castrovirreyna',
        distritos: ['Castrovirreyna', 'Arma', 'Aurahua', 'Capillas', 'Chupamarca', 'Cocas', 'Huachos', 'Huamatambo', 'Mollepampa', 'San Juan', 'Santa Ana', 'Tantara', 'Ticrapo']
      },
      {
        provincia: 'Churcampa',
        distritos: ['Churcampa', 'Anco', 'Chinchihuasi', 'El Carmen', 'La Merced', 'Locroja', 'Paucarbamba', 'San Miguel de Mayocc', 'San Pedro de Coris', 'Pachamarca', 'Cosme']
      },
      {
        provincia: 'Huaytará',
        distritos: ['Huaytará', 'Ayavi', 'Córdova', 'Huayacundo Arma', 'Laramarca', 'Ocoyo', 'Pilpichaca', 'Querco', 'Quito-Arma', 'San Antonio de Cusicancha', 'San Francisco de Sangayaico', 'San Isidro', 'Santiago de Chocorvos', 'Santiago de Quirahuara', 'Santo Domingo de Capillas', 'Tambo']
      },
      {
        provincia: 'Tayacaja',
        distritos: ['Pampas', 'Acostambo', 'Acraquia', 'Ahuaycha', 'Colcabamba', 'Daniel Hernández', 'Huachocolpa', 'Huaribamba', 'Ñahuimpuquio', 'Pazos', 'Quishuar', 'Salcabamba', 'Salcahuasi', 'San Marcos de Rocchac', 'Surcubamba', 'Tintay Puncu', 'Quichuas', 'Andaymarca', 'Roble', 'Pichos', 'Santiago de Tucuma']
      }
    ]
  },
  {
    departamento: 'Huánuco',
    provincias: [
      {
        provincia: 'Huánuco',
        distritos: ['Huánuco', 'Amarilis', 'Chinchao', 'Churubamba', 'Margos', 'Quisqui', 'San Francisco de Cayran', 'San Pedro de Chaulan', 'Santa María del Valle', 'Yarumayo', 'Pillco Marca', 'Yacus']
      },
      {
        provincia: 'Ambo',
        distritos: ['Ambo', 'Cayna', 'Colpas', 'Conchamarca', 'Huacar', 'San Francisco', 'San Rafael', 'Tomay Kichwa']
      },
      {
        provincia: 'Dos de Mayo',
        distritos: ['La Unión', 'Chuquis', 'Mariás', 'Pachas', 'Quivilla', 'Ripan', 'Shunqui', 'Sillapata', 'Yanas']
      },
      {
        provincia: 'Huacaybamba',
        distritos: ['Huacaybamba', 'Canchabamba', 'Cochabamba', 'Pinra']
      },
      {
        provincia: 'Huamalíes',
        distritos: ['Llata', 'Arancay', 'Chavín de Pariarca', 'Jacas Grande', 'Jircan', 'Miraflores', 'Monzón', 'Punchao', 'Puños', 'Singa', 'Tantamayo']
      },
      {
        provincia: 'Leoncio Prado',
        distritos: ['Rupa-Rupa', 'Daniel Alomía Robles', 'Hermílio Valdizan', 'José Crespo y Castillo', 'Luyando', 'Mariano Damaso Beraun', 'Pucayacu', 'Castillo Grande', 'Pueblo Nuevo', 'Santo Domingo de Anda']
      },
      {
        provincia: 'Marañón',
        distritos: ['Huacrachuco', 'Cholon', 'San Buenaventura']
      },
      {
        provincia: 'Pachitea',
        distritos: ['Panao', 'Chaglla', 'Molino', 'Umari']
      },
      {
        provincia: 'Puerto Inca',
        distritos: ['Puerto Inca', 'Codo del Pozuzo', 'Honoria', 'Tournavista', 'Yuyapichis']
      },
      {
        provincia: 'Lauricocha',
        distritos: ['Jesús', 'Baños', 'Jivia', 'Queropalca', 'Rondos', 'San Francisco de Asís', 'San Miguel de Cauri']
      },
      {
        provincia: 'Yarowilca',
        distritos: ['Chavinillo', 'Cahuac', 'Chacabamba', 'Chupan', 'Jacas Chico', 'Obas', 'Pampamarca', 'Choras']
      }
    ]
  },
  {
    departamento: 'Ica',
    provincias: [
      {
        provincia: 'Ica',
        distritos: ['Ica', 'La Tinguiña', 'Los Aquijes', 'Ocucaje', 'Pachacutec', 'Parcona', 'Pueblo Nuevo', 'Salas', 'San José de Los Molinos', 'San Juan Bautista', 'Santiago', 'Subtanjalla', 'Tate', 'Yauca del Rosario']
      },
      {
        provincia: 'Chincha',
        distritos: ['Chincha Alta', 'Alto Laran', 'Chavin', 'Chincha Baja', 'El Carmen', 'Grocio Prado', 'Pueblo Nuevo', 'San Juan de Yanac', 'San Pedro de Huacarpana', 'Sunampe', 'Tambo de Mora']
      },
      {
        provincia: 'Nazca',
        distritos: ['Nazca', 'Changuillo', 'El Ingenio', 'Marcona', 'Vista Alegre']
      },
      {
        provincia: 'Palpa',
        distritos: ['Palpa', 'Llipata', 'Río Grande', 'Santa Cruz', 'Tibillo']
      },
      {
        provincia: 'Pisco',
        distritos: ['Pisco', 'Huancano', 'Humay', 'Independencia', 'Paracas', 'San Andrés', 'San Clemente', 'Tupac Amaru Inca']
      }
    ]
  },
  {
    departamento: 'Junín',
    provincias: [
      {
        provincia: 'Huancayo',
        distritos: ['Huancayo', 'Carhuacallanga', 'Chacapampa', 'Chicche', 'Chilca', 'Chongos Alto', 'Chupuro', 'Colca', 'Cullhuas', 'El Tambo', 'Huacrapuquio', 'Hualhuas', 'Huancan', 'Huasicancha', 'Huayucachi', 'Ingenio', 'Pariahuanca', 'Pilcomayo', 'Pucara', 'Quichuay', 'Quilcas', 'San Agustín', 'San Jerónimo de Tunan', 'Saño', 'Sapallanga', 'Sicaya', 'Santo Domingo de Acobamba', 'Viques']
      },
      {
        provincia: 'Concepción',
        distritos: ['Concepción', 'Aco', 'Andamarca', 'Chambara', 'Cochas', 'Comas', 'Heroínas Toledo', 'Manzanares', 'Mariscal Castilla', 'Matahuasi', 'Mito', 'Nueve de Julio', 'Orcotuna', 'San José de Quero', 'Santa Rosa de Ocopa']
      },
      {
        provincia: 'Chanchamayo',
        distritos: ['Chanchamayo', 'Perené', 'Pichanaqui', 'San Luis de Shuaro', 'San Ramón', 'Vitoc']
      },
      {
        provincia: 'Jauja',
        distritos: ['Jauja', 'Acolla', 'Apata', 'Ataura', 'Canchayllo', 'Curicaca', 'El Mantaro', 'Huamali', 'Huaripampa', 'Huertas', 'Janjaillo', 'Julcán', 'Leonor Ordóñez', 'Llocllapampa', 'Marco', 'Masma', 'Masma Chicche', 'Molinos', 'Monobamba', 'Muqui', 'Muquiyauyo', 'Paca', 'Paccha', 'Pancan', 'Parco', 'Pomacancha', 'Ricran', 'San Lorenzo', 'San Pedro de Chunan', 'Sausa', 'Sincos', 'Tunan Marca', 'Yauli', 'Yauyos']
      },
      {
        provincia: 'Junín',
        distritos: ['Junín', 'Carhuamayo', 'Ondores', 'Ulcumayo']
      },
      {
        provincia: 'Satipo',
        distritos: ['Satipo', 'Coviriali', 'Llaylla', 'Mazamari', 'Pampa Hermosa', 'Pangoa', 'Río Negro', 'Río Tambo', 'Vizcatán del Ene']
      },
      {
        provincia: 'Tarma',
        distritos: ['Tarma', 'Acobamba', 'Huaricolca', 'Huasahuasi', 'La Unión', 'Palca', 'Palcamayo', 'San Pedro de Cajas', 'Tapo', 'Ricardo Palma']
      },
      {
        provincia: 'Yauli',
        distritos: ['La Oroya', 'Chacapalpa', 'Huay-Huay', 'Marcapomacocha', 'Morococha', 'Paccha', 'Santa Barbara de Carhuacayan', 'Santa Rosa de Sacco', 'Suitucancha', 'Yauli']
      },
      {
        provincia: 'Chupaca',
        distritos: ['Chupaca', 'Ahuac', 'Chongos Bajo', 'Huachac', 'Huamancaca Chico', 'San Juan de Iscos', 'San Juan de Jarpa', 'Tres de Diciembre', 'Yanacancha']
      }
    ]
  },
  {
    departamento: 'La Libertad',
    provincias: [
      {
        provincia: 'Trujillo',
        distritos: ['Trujillo', 'El Porvenir', 'Florencia de Mora', 'Huanchaco', 'La Esperanza', 'Laredo', 'Moche', 'Poroto', 'Salaverry', 'Simbal', 'Victor Larco Herrera']
      },
      {
        provincia: 'Ascope',
        distritos: ['Ascope', 'Chicama', 'Chocope', 'Magdalena de Cao', 'Paiján', 'Rázuri', 'Santiago de Cao', 'Casa Grande']
      },
      {
        provincia: 'Bolívar',
        distritos: ['Bolívar', 'Bambamarca', 'Condormarca', 'Longotea', 'Uchumarca', 'Ucuncha']
      },
      {
        provincia: 'Chepén',
        distritos: ['Chepén', 'Pacanga', 'Pueblo Nuevo']
      },
      {
        provincia: 'Gran Chimú',
        distritos: ['Cascas', 'Lucma', 'Marmot', 'Sayapullo']
      },
      {
        provincia: 'Julcán',
        distritos: ['Julcán', 'Calamarca', 'Carabamba', 'Huaso']
      },
      {
        provincia: 'Otuzco',
        distritos: ['Otuzco', 'Agallpampa', 'Charat', 'Huaranchal', 'La Cuesta', 'Mache', 'Paranday', 'Salpo', 'Sinsicap', 'Usquil']
      },
      {
        provincia: 'Pacasmayo',
        distritos: ['San Pedro de Lloc', 'Guadalupe', 'Jequetepeque', 'Pacasmayo', 'San José']
      },
      {
        provincia: 'Pataz',
        distritos: ['Tayabamba', 'Buldibuyo', 'Chillia', 'Huancaspata', 'Huaylillas', 'Huayo', 'Ongon', 'Parcoy', 'Pataz', 'Pias', 'Santiago de Challas', 'Taurija', 'Urpay']
      },
      {
        provincia: 'Sánchez Carrión',
        distritos: ['Huamachuco', 'Chugay', 'Cochorco', 'Curgos', 'Marcabal', 'Sanagoran', 'Sarin', 'Sartimbamba']
      },
      {
        provincia: 'Santiago de Chuco',
        distritos: ['Santiago de Chuco', 'Angasmarca', 'Cachicadán', 'Mollebamba', 'Mollepata', 'Quiruvilca', 'Santa Cruz de Chuca', 'Sitabamba']
      },
      {
        provincia: 'Virú',
        distritos: ['Virú', 'Chao', 'Guadalupito']
      }
    ]
  },
  {
    departamento: 'Lambayeque',
    provincias: [
      {
        provincia: 'Chiclayo',
        distritos: ['Chiclayo', 'Chongoyape', 'Eten', 'Eten Puerto', 'José Leonardo Ortiz', 'La Victoria', 'Lagunas', 'Monsefú', 'Nueva Arica', 'Oyotún', 'Picsi', 'Pimentel', 'Reque', 'Santa Rosa', 'Saña', 'Cayaltí', 'Patapo', 'Pomalca', 'Pucalá', 'Tumán', 'Pomalca', 'Pucalá', 'Tumán']
      },
      {
        provincia: 'Ferreñafe',
        distritos: ['Ferreñafe', 'Cañaris', 'Incahuasi', 'Manuel Antonio Mesones Muro', 'Pítipo', 'Pueblo Nuevo']
      },
      {
        provincia: 'Lambayeque',
        distritos: ['Lambayeque', 'Chochope', 'Illimo', 'Jayanca', 'Mochumi', 'Morrope', 'Motupe', 'Olmos', 'Pacora', 'Salas', 'San José', 'Túcume']
      }
    ]
  },
  {
    departamento: 'Lima',
    provincias: [
      {
        provincia: 'Lima',
        distritos: ['Lima', 'Ancón', 'Ate', 'Barranco', 'Breña', 'Carabayllo', 'Chaclacayo', 'Chorrillos', 'Cieneguilla', 'Comas', 'El Agustino', 'Independencia', 'Jesús María', 'La Molina', 'La Victoria', 'Lince', 'Los Olivos', 'Lurigancho', 'Lurín', 'Magdalena del Mar', 'Miraflores', 'Pachacamac', 'Pucusana', 'Pueblo Libre', 'Puente Piedra', 'Punta Hermosa', 'Punta Negra', 'Rímac', 'San Bartolo', 'San Borja', 'San Isidro', 'San Juan de Lurigancho', 'San Juan de Miraflores', 'San Luis', 'San Martín de Porres', 'San Miguel', 'Santa Anita', 'Santa María del Mar', 'Santa Rosa', 'Santiago de Surco', 'Surquillo', 'Villa El Salvador', 'Villa María del Triunfo']
      },
      {
        provincia: 'Barranca',
        distritos: ['Barranca', 'Paramonga', 'Pativilca', 'Supe', 'Supe Puerto']
      },
      {
        provincia: 'Cajatambo',
        distritos: ['Cajatambo', 'Copa', 'Gorgor', 'Huancapon', 'Manas']
      },
      {
        provincia: 'Canta',
        distritos: ['Canta', 'Arahuay', 'Huamantanga', 'Huaros', 'Lachaqui', 'San Buenaventura', 'Santa Rosa de Quives']
      },
      {
        provincia: 'Cañete',
        distritos: ['San Vicente de Cañete', 'Asia', 'Calango', 'Cerro Azul', 'Chilca', 'Coayllo', 'Imperial', 'Lunahuaná', 'Mala', 'Nuevo Imperial', 'Pacarán', 'Quilmana', 'San Antonio', 'San Luis', 'Santa Cruz de Flores', 'Zúñiga']
      },
      {
        provincia: 'Huaral',
        distritos: ['Huaral', 'Atavillos Alto', 'Atavillos Bajo', 'Aucallama', 'Chancay', 'Ihuari', 'Lampian', 'Pacaraos', 'San Miguel de Acos', 'Santa Cruz de Andamarca', 'Sumbilca', 'Veintisiete de Noviembre']
      },
      {
        provincia: 'Huarochirí',
        distritos: ['Matucana', 'Antioquia', 'Callahuanca', 'Carampoma', 'Chicla', 'Cuenca', 'Huachupampa', 'Huanza', 'Huarochirí', 'Lahuaytambo', 'Langa', 'Laraos', 'Mariatana', 'Ricardo Palma', 'San Andrés de Tupicocha', 'San Antonio', 'San Bartolomé', 'San Damian', 'San Juan de Iris', 'San Juan de Tantaranche', 'San Lorenzo de Quinti', 'San Mateo', 'San Mateo de Otao', 'San Pedro de Casta', 'San Pedro de Huancaire', 'Sangallaya', 'Santa Cruz de Cocachacra', 'Santa Eulalia', 'Santiago de Anchucaya', 'Santiago de Tuna', 'Santo Domingo de los Olleros', 'Surco']
      },
      {
        provincia: 'Huaura',
        distritos: ['Huacho', 'Ambar', 'Caleta de Carquín', 'Checras', 'Hualmay', 'Huaura', 'Leoncio Prado', 'Paccho', 'Santa Leonor', 'Santa María', 'Sayan', 'Vegueta']
      },
      {
        provincia: 'Oyón',
        distritos: ['Oyón', 'Andajes', 'Caujul', 'Cochamarca', 'Navan', 'Pachangara']
      },
      {
        provincia: 'Yauyos',
        distritos: ['Yauyos', 'Alis', 'Allauca', 'Ayaviri', 'Azángaro', 'Cacra', 'Carania', 'Catahuasi', 'Chocos', 'Cochas', 'Colonia', 'Hongos', 'Huampara', 'Huancaya', 'Huangascar', 'Huantan', 'Huañec', 'Laraos', 'Lincha', 'Madean', 'Miraflores', 'Omas', 'Putinza', 'Quinches', 'Quinocay', 'San Joaquín', 'San Pedro de Pilas', 'Tanta', 'Tauripampa', 'Tomas', 'Tupe', 'Viñac', 'Vitis']
      }
    ]
  },
  {
    departamento: 'Loreto',
    provincias: [
      {
        provincia: 'Maynas',
        distritos: ['Iquitos', 'Alto Nanay', 'Fernando Lores', 'Indiana', 'Las Amazonas', 'Mazan', 'Napo', 'Punchana', 'Putumayo', 'Torres Causana', 'Belen', 'San Juan Bautista', 'Teniente Manuel Clavero']
      },
      {
        provincia: 'Alto Amazonas',
        distritos: ['Yurimaguas', 'Balsapuerto', 'Jeberos', 'Lagunas', 'Santa Cruz', 'Teniente Cesar Lopez Rojas']
      },
      {
        provincia: 'Datem del Marañón',
        distritos: ['Barranca', 'Cahuapanas', 'Manseriche', 'Morona', 'Pastaza', 'Andoas']
      },
      {
        provincia: 'Loreto',
        distritos: ['Nauta', 'Parinari', 'Tigre', 'Trompeteros', 'Urarinas']
      },
      {
        provincia: 'Mariscal Ramón Castilla',
        distritos: ['Ramón Castilla', 'Pebas', 'Yavari', 'San Pablo']
      },
      {
        provincia: 'Putumayo',
        distritos: ['Putumayo', 'Rosa Panduro', 'Teniente Manuel Clavero', 'Yaguas']
      },
      {
        provincia: 'Requena',
        distritos: ['Requena', 'Alto Tapiche', 'Capelo', 'Emilio San Martin', 'Maquia', 'Puinahua', 'Saquena', 'Soplin', 'Tapiche', 'Jenaro Herrera', 'Yaquerana']
      },
      {
        provincia: 'Ucayali',
        distritos: ['Contamana', 'Inahuaya', 'Padre Marquez', 'Pampa Hermosa', 'Sarayacu', 'Vargas Guerra']
      }
    ]
  },
  {
    departamento: 'Madre de Dios',
    provincias: [
      {
        provincia: 'Tambopata',
        distritos: ['Tambopata', 'Inambari', 'Las Piedras', 'Laberinto']
      },
      {
        provincia: 'Manu',
        distritos: ['Manu', 'Fitzcarrald', 'Madre de Dios', 'Huepetuhe']
      },
      {
        provincia: 'Tahuamanu',
        distritos: ['Iñapari', 'Iberia', 'Tahuamanu']
      }
    ]
  },
  {
    departamento: 'Moquegua',
    provincias: [
      {
        provincia: 'Mariscal Nieto',
        distritos: ['Moquegua', 'Carumas', 'Cuchumbaya', 'Samegua', 'San Cristóbal', 'Torata']
      },
      {
        provincia: 'General Sánchez Cerro',
        distritos: ['Omate', 'Chojata', 'Coalaque', 'Ichuña', 'La Capilla', 'Lloque', 'Matalaque', 'Puquina', 'Quinistaquillas', 'Ubinas', 'Yunga']
      },
      {
        provincia: 'Ilo',
        distritos: ['Ilo', 'El Algarrobal', 'Pacocha']
      }
    ]
  },
  {
    departamento: 'Pasco',
    provincias: [
      {
        provincia: 'Pasco',
        distritos: ['Chaupimarca', 'Huachon', 'Huariaca', 'Huayllay', 'Ninacaca', 'Pallanchacra', 'Paucartambo', 'San Francisco de Asís de Yarusyacan', 'Simon Bolívar', 'Ticlacayan', 'Tinyahuarco', 'Vicco', 'Yanacancha']
      },
      {
        provincia: 'Daniel Alcides Carrión',
        distritos: ['Yanahuanca', 'Chacayan', 'Goyllarisquizga', 'Paucar', 'San Pedro de Pillao', 'Santa Ana de Tusi', 'Tapuc', 'Vilcabamba']
      },
      {
        provincia: 'Oxapampa',
        distritos: ['Oxapampa', 'Chontabamba', 'Huancabamba', 'Palcazu', 'Pozuzo', 'Puerto Bermúdez', 'Villa Rica', 'Constitución']
      }
    ]
  },
  {
    departamento: 'Piura',
    provincias: [
      {
        provincia: 'Piura',
        distritos: ['Piura', 'Castilla', 'Catacaos', 'Cura Mori', 'El Tallan', 'La Arena', 'La Unión', 'Las Lomas', 'Tambo Grande', 'Veintiseis de Octubre']
      },
      {
        provincia: 'Ayabaca',
        distritos: ['Ayabaca', 'Frias', 'Jilili', 'Lagunas', 'Montero', 'Pacaipampa', 'Paimas', 'Sapillica', 'Sicchez', 'Suyo']
      },
      {
        provincia: 'Huancabamba',
        distritos: ['Huancabamba', 'Canchaque', 'El Carmen de la Frontera', 'Huarmaca', 'Lalaquiz', 'San Miguel de El Faique', 'Sondor', 'Sondorillo']
      },
      {
        provincia: 'Morropón',
        distritos: ['Chulucanas', 'Buenos Aires', 'Chalaco', 'Chulucanas', 'La Matanza', 'Morropon', 'Salitral', 'San Juan de Bigote', 'Santa Catalina de Mossa', 'Santo Domingo', 'Yamango']
      },
      {
        provincia: 'Paita',
        distritos: ['Paita', 'Amotape', 'Arenal', 'Colan', 'La Huaca', 'Tamarindo', 'Vichayal']
      },
      {
        provincia: 'Sullana',
        distritos: ['Sullana', 'Bellavista', 'Ignacio Escudero', 'Lancones', 'Marcavelica', 'Miguel Checa', 'Querecotillo', 'Salitral', 'Sullana']
      },
      {
        provincia: 'Talara',
        distritos: ['Pariñas', 'El Alto', 'La Brea', 'Lobitos', 'Los Organos', 'Mancora']
      },
      {
        provincia: 'Sechura',
        distritos: ['Sechura', 'Bellavista de la Unión', 'Bernal', 'Cristo Nos Valga', 'Rinconada Llicuar', 'Vice']
      }
    ]
  },
  {
    departamento: 'Puno',
    provincias: [
      {
        provincia: 'Puno',
        distritos: ['Puno', 'Acora', 'Amantani', 'Atuncolla', 'Capachica', 'Chucuito', 'Coata', 'Huata', 'Mañazo', 'Paucarcolla', 'Pichacani', 'Plateria', 'San Antonio', 'Tiquillaca', 'Vilque']
      },
      {
        provincia: 'Azángaro',
        distritos: ['Azángaro', 'Achaya', 'Arapa', 'Asillo', 'Caminaca', 'Chupa', 'José Domingo Choquehuanca', 'Muñani', 'Potoni', 'Saman', 'San Anton', 'San Jose', 'San Juan de Salinas', 'Santiago de Pupuja', 'Tirapata']
      },
      {
        provincia: 'Carabaya',
        distritos: ['Macusani', 'Ajoyani', 'Ayapata', 'Coasa', 'Corani', 'Crucero', 'Ituata', 'Ollachea', 'San Gaban', 'Usicayos']
      },
      {
        provincia: 'Chucuito',
        distritos: ['Juli', 'Desaguadero', 'Huacullani', 'Kelluyo', 'Pisacoma', 'Pomata', 'Zepita']
      },
      {
        provincia: 'El Collao',
        distritos: ['Ilave', 'Capazo', 'Pilcuyo', 'Santa Rosa', 'Conduriri']
      },
      {
        provincia: 'Huancané',
        distritos: ['Huancané', 'Cojata', 'Huatasani', 'Inchupalla', 'Pusi', 'Rosaspata', 'Taraco', 'Vilque Chico']
      },
      {
        provincia: 'Lampa',
        distritos: ['Lampa', 'Cabanilla', 'Calapuja', 'Nicasio', 'Ocuviri', 'Palca', 'Paratia', 'Pucara', 'Santa Lucia', 'Vilavila']
      },
      {
        provincia: 'Melgar',
        distritos: ['Ayaviri', 'Antauta', 'Cupi', 'Llalli', 'Macari', 'Nuñoa', 'Orurillo', 'Santa Rosa', 'Umachiri']
      },
      {
        provincia: 'Moho',
        distritos: ['Moho', 'Conima', 'Huayrapata', 'Tilali']
      },
      {
        provincia: 'San Antonio de Putina',
        distritos: ['Putina', 'Ananea', 'Pedro Vilca Apaza', 'Quilcapuncu', 'Sina']
      },
      {
        provincia: 'San Román',
        distritos: ['Juliaca', 'Cabana', 'Cabanillas', 'Caracoto', 'San Miguel', 'Calapuja']
      },
      {
        provincia: 'Sandia',
        distritos: ['Sandia', 'Cuyocuyo', 'Limbani', 'Patambuco', 'Phara', 'Quiaca', 'San Juan del Oro', 'Yanahuaya', 'Alto Inambari', 'San Pedro de Putina Punco']
      },
      {
        provincia: 'Yunguyo',
        distritos: ['Yunguyo', 'Anapia', 'Copani', 'Cuturapi', 'Ollaraya', 'Tinicachi', 'Unicachi']
      }
    ]
  },
  {
    departamento: 'San Martín',
    provincias: [
      {
        provincia: 'Moyobamba',
        distritos: ['Moyobamba', 'Calzada', 'Habana', 'Jepelacio', 'Soritor', 'Yantaló']
      },
      {
        provincia: 'Bellavista',
        distritos: ['Bellavista', 'Alto Biavo', 'Bajo Biavo', 'Huallaga', 'San Pablo', 'San Rafael']
      },
      {
        provincia: 'El Dorado',
        distritos: ['San Jose de Sisa', 'Agua Blanca', 'San Martín', 'Santa Rosa', 'Shatoja']
      },
      {
        provincia: 'Huallaga',
        distritos: ['Saposoa', 'Alto Saposoa', 'El Eslabón', 'Piscoyacu', 'Sacanche', 'Tingo de Saposoa']
      },
      {
        provincia: 'Lamas',
        distritos: ['Lamas', 'Alonso de Alvarado', 'Barranquita', 'Caynarachi', 'Cuñumbuqui', 'Pinto Recodo', 'Rumisapa', 'San Roque de Cumbaza', 'Shanao', 'Tabalosos', 'Zapatero']
      },
      {
        provincia: 'Mariscal Cáceres',
        distritos: ['Juanjuí', 'Campanilla', 'Huicungo', 'Pachiza', 'Pajarillo']
      },
      {
        provincia: 'Picota',
        distritos: ['Picota', 'Buenos Aires', 'Caspisapa', 'Pilluana', 'Pucacaca', 'San Cristóbal', 'San Hilarión', 'Shamboyacu', 'Tingo de Ponasa', 'Tres Unidos']
      },
      {
        provincia: 'Rioja',
        distritos: ['Rioja', 'Awajun', 'Elias Soplin Vargas', 'Nueva Cajamarca', 'Pardo Miguel', 'Posic', 'San Fernando', 'Yorongos', 'Yuracyacu']
      },
      {
        provincia: 'San Martín',
        distritos: ['Tarapoto', 'Alberto Leveau', 'Cacatachi', 'Chazuta', 'Chipurana', 'El Porvenir', 'Huimbayoc', 'Juan Guerra', 'La Banda de Shilcayo', 'Morales', 'Papaplaya', 'San Antonio', 'Sauce', 'Shapaja']
      },
      {
        provincia: 'Tocache',
        distritos: ['Tocache', 'Nuevo Progreso', 'Polvora', 'Shunte', 'Uchiza']
      }
    ]
  },
  {
    departamento: 'Tacna',
    provincias: [
      {
        provincia: 'Tacna',
        distritos: ['Tacna', 'Alto de la Alianza', 'Calana', 'Ciudad Nueva', 'Inclan', 'Pachia', 'Palca', 'Pocollay', 'Sama', 'Coronel Gregorio Albarracín Lanchipa']
      },
      {
        provincia: 'Candarave',
        distritos: ['Candarave', 'Cairani', 'Camilaca', 'Curibaya', 'Huanuara', 'Quilahuani']
      },
      {
        provincia: 'Jorge Basadre',
        distritos: ['Locumba', 'Ilabaya', 'Ite']
      },
      {
        provincia: 'Tarata',
        distritos: ['Tarata', 'Chucatamani', 'Estique', 'Estique-Pampa', 'Sitajara', 'Susapaya', 'Tarucachi', 'Ticaco']
      }
    ]
  },
  {
    departamento: 'Tumbes',
    provincias: [
      {
        provincia: 'Tumbes',
        distritos: ['Tumbes', 'Corrales', 'La Cruz', 'Pampas de Hospital', 'San Jacinto', 'San Juan de la Virgen']
      },
      {
        provincia: 'Contralmirante Villar',
        distritos: ['Zorritos', 'Casitas', 'Canoas de Punta Sal']
      },
      {
        provincia: 'Zarumilla',
        distritos: ['Zarumilla', 'Aguas Verdes', 'Matapalo', 'Papayal']
      }
    ]
  },
  {
    departamento: 'Ucayali',
    provincias: [
      {
        provincia: 'Coronel Portillo',
        distritos: ['Calleria', 'Campoverde', 'Iparia', 'Masisea', 'Yarinacocha', 'Nueva Requena']
      },
      {
        provincia: 'Atalaya',
        distritos: ['Raymondi', 'Sepahua', 'Tahuania', 'Yurua']
      },
      {
        provincia: 'Padre Abad',
        distritos: ['Padre Abad', 'Irazola', 'Curimana', 'Neshuya', 'Alexander Von Humboldt']
      },
      {
        provincia: 'Purús',
        distritos: ['Purús']
      }
    ]
  }
]

// Funciones de ayuda para obtener datos filtrados
export function getDepartamentos(): string[] {
  return UBIGEOS_PERU.map(u => u.departamento)
}

export function getProvinciasByDepartamento(departamento: string): string[] {
  const ubigeo = UBIGEOS_PERU.find(u => u.departamento === departamento)
  return ubigeo ? ubigeo.provincias.map(p => p.provincia) : []
}

export function getDistritosByProvincia(departamento: string, provincia: string): string[] {
  const ubigeo = UBIGEOS_PERU.find(u => u.departamento === departamento)
  if (!ubigeo) return []
  
  const prov = ubigeo.provincias.find(p => p.provincia === provincia)
  return prov ? prov.distritos : []
}

