// Seleções que fazem uma partida de "Amistosos internacionais" aparecer na tela inicial
// (arquivo "paises amistosos.txt" do Lucas, 11/2026). Basta UMA das duas equipes estar aqui.
// Só vale para seleções principais: U23, U20, femininas etc. nunca entram.
//
// A lista vira configurável na tela de configuração; este arquivo é o ponto único a trocar.

/** ID da competição "Friendlies" (amistosos de seleções) na API-Football. */
export const INTERNATIONAL_FRIENDLIES_ID = 10;

export interface FriendlyNation {
    /** Nome em português, como no arquivo. */
    name: string;
    /** Nomes que a API-Football usa para a seleção principal (o primeiro é o oficial dela). */
    apiNames: readonly string[];
}

export const FRIENDLY_NATIONS: readonly FriendlyNation[] = [
    { name: 'Espanha', apiNames: ['Spain'] },
    { name: 'Argentina', apiNames: ['Argentina'] },
    { name: 'França', apiNames: ['France'] },
    { name: 'Inglaterra', apiNames: ['England'] },
    { name: 'Portugal', apiNames: ['Portugal'] },
    { name: 'Brasil', apiNames: ['Brazil'] },
    { name: 'Marrocos', apiNames: ['Morocco'] },
    { name: 'Bélgica', apiNames: ['Belgium'] },
    { name: 'Países Baixos', apiNames: ['Netherlands'] },
    { name: 'México', apiNames: ['Mexico'] },
    { name: 'Colômbia', apiNames: ['Colombia'] },
    { name: 'Suíça', apiNames: ['Switzerland'] },
    { name: 'Alemanha', apiNames: ['Germany'] },
    { name: 'Croácia', apiNames: ['Croatia'] },
    { name: 'Itália', apiNames: ['Italy'] },
    { name: 'Estados Unidos', apiNames: ['USA', 'United States'] },
    { name: 'Japão', apiNames: ['Japan'] },
    { name: 'Senegal', apiNames: ['Senegal'] },
    { name: 'Noruega', apiNames: ['Norway'] },
    { name: 'Uruguai', apiNames: ['Uruguay'] },
    { name: 'Dinamarca', apiNames: ['Denmark'] },
    { name: 'Áustria', apiNames: ['Austria'] },
    { name: 'Irã', apiNames: ['Iran'] },
    { name: 'Equador', apiNames: ['Ecuador'] },
    { name: 'Egito', apiNames: ['Egypt'] },
    { name: 'Austrália', apiNames: ['Australia'] },
    { name: 'Canadá', apiNames: ['Canada'] },
    { name: 'Argélia', apiNames: ['Algeria'] },
    { name: 'Costa do Marfim', apiNames: ['Ivory Coast', "Cote d'Ivoire"] },
    { name: 'Nigéria', apiNames: ['Nigeria'] },
    { name: 'Turquia', apiNames: ['Türkiye', 'Turkey'] },
    { name: 'Coreia do Sul', apiNames: ['South Korea', 'Korea Republic'] },
    { name: 'Paraguai', apiNames: ['Paraguay'] },
    { name: 'Suécia', apiNames: ['Sweden'] },
    { name: 'Rússia', apiNames: ['Russia'] },
    { name: 'Ucrânia', apiNames: ['Ukraine'] },
    { name: 'Polônia', apiNames: ['Poland'] },
    { name: 'Hungria', apiNames: ['Hungary'] },
    { name: 'País de Gales', apiNames: ['Wales'] },
    { name: 'RD Congo', apiNames: ['Congo DR', 'DR Congo'] },
    { name: 'Grécia', apiNames: ['Greece'] },
    { name: 'Camarões', apiNames: ['Cameroon'] },
    { name: 'Escócia', apiNames: ['Scotland'] },
    { name: 'Sérvia', apiNames: ['Serbia'] },
    { name: 'Eslováquia', apiNames: ['Slovakia'] },
    { name: 'Panamá', apiNames: ['Panama'] },
    { name: 'Mali', apiNames: ['Mali'] },
    { name: 'África do Sul', apiNames: ['South Africa'] },
    { name: 'Venezuela', apiNames: ['Venezuela'] },
    { name: 'Chile', apiNames: ['Chile'] },
    { name: 'Tchéquia', apiNames: ['Czechia', 'Czech Republic'] },
    { name: 'Eslovênia', apiNames: ['Slovenia'] },
    { name: 'Peru', apiNames: ['Peru'] },
    { name: 'Costa Rica', apiNames: ['Costa Rica'] },
    { name: 'Arábia Saudita', apiNames: ['Saudi Arabia'] },
    { name: 'Irlanda', apiNames: ['Rep. Of Ireland', 'Republic of Ireland', 'Ireland'] },
    { name: 'Bósnia e Herzegovina', apiNames: ['Bosnia & Herzegovina', 'Bosnia and Herzegovina'] },
    { name: 'Romênia', apiNames: ['Romania'] },
    { name: 'Uzbequistão', apiNames: ['Uzbekistan'] },
    { name: 'Catar', apiNames: ['Qatar'] },
    { name: 'Tunísia', apiNames: ['Tunisia'] },
    { name: 'Burkina Faso', apiNames: ['Burkina Faso'] },
    { name: 'Iraque', apiNames: ['Iraq'] },
    { name: 'Irlanda do Norte', apiNames: ['Northern Ireland'] },
    { name: 'Emirados Árabes Unidos', apiNames: ['United Arab Emirates', 'UAE'] },
    { name: 'Albânia', apiNames: ['Albania'] },
    { name: 'Honduras', apiNames: ['Honduras'] },
    { name: 'Cabo Verde', apiNames: ['Cape Verde Islands', 'Cape Verde'] },
    { name: 'Jamaica', apiNames: ['Jamaica'] },
    { name: 'Gana', apiNames: ['Ghana'] },
];
