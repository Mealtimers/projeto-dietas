import { useState, useEffect } from 'react';
import { portalPublicApi } from '../../services/api';

const GRUPOS_INTERESSE = ['Proteina', 'Proteína', 'Carboidrato', 'Leguminosa', 'Legume', 'Molho'];
const MIN_PRATOS = 7;
const MIN_QTD_POR_PROTEINA = 3;

export default function PortalPage() {
  const [step, setStep]     = useState(1); // 1=dados, 2=preferências, 3=confirmação, 4=sucesso
  const [opcoes, setOpcoes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [enviando, setEnviando] = useState(false);
  const [error, setError]   = useState(null);

  // Dados pessoais
  const [nome, setNome]         = useState('');
  const [email, setEmail]       = useState('');
  const [telefone, setTelefone] = useState('');

  // Preferências
  const [totalPratos, setTotalPratos] = useState(MIN_PRATOS);

  // Proteínas — array de {alimentoNome, gramagem, quantidade}
  const [proteinas, setProteinas] = useState([{ alimentoNome: '', gramagem: 150, quantidade: MIN_PRATOS }]);

  // Carboidrato
  const [carbAtivo, setCarbAtivo]       = useState(false);
  const [carbGramagem, setCarbGramagem] = useState(140);
  const [carbSelecionados, setCarbSelecionados] = useState([]);

  // Leguminosa
  const [legumAtivo, setLegumAtivo]       = useState(false);
  const [legumGramagem, setLegumGramagem] = useState(100);
  const [legumSelecionados, setLegumSelecionados] = useState([]);

  // Legume
  const [legumeAtivo, setLegumeAtivo]       = useState(false);
  const [legumeGramagem, setLegumeGramagem] = useState(80);
  const [legumeSelecionados, setLegumeSelecionados] = useState([]);
  const [legumeObs, setLegumeObs]           = useState('');

  // Molhos
  const [molhosSelecionados, setMolhosSelecionados] = useState([]);

  // Observações
  const [observacoes, setObservacoes] = useState('');

  useEffect(() => {
    portalPublicApi.opcoes()
      .then(res => setOpcoes(res.data))
      .catch(() => setError('Erro ao carregar opções. Tente recarregar a página.'))
      .finally(() => setLoading(false));
  }, []);

  const getGrupo = (nomes) => {
    const arr = Array.isArray(nomes) ? nomes : [nomes];
    return opcoes.find(g => arr.some(n => g.nome.toLowerCase().includes(n.toLowerCase())));
  };

  const grpProteina   = getGrupo(['Proteina', 'Proteína']);
  const grpCarb       = getGrupo(['Carboidrato']);
  const grpLeguminosa = getGrupo(['Leguminosa']);
  const grpLegume     = getGrupo(['Legume']);
  const grpMolho      = getGrupo(['Molho']);

  // ── Proteínas helpers ─────────────────────────────────────────────────────
  const addProteina = () =>
    setProteinas(p => [...p, { alimentoNome: '', gramagem: 150, quantidade: MIN_QTD_POR_PROTEINA }]);

  const removeProteina = (idx) =>
    setProteinas(p => p.filter((_, i) => i !== idx));

  const updateProteina = (idx, field, val) =>
    setProteinas(p => p.map((item, i) => i === idx ? { ...item, [field]: val } : item));

  const somaProteinas = proteinas.reduce((s, p) => s + (parseInt(p.quantidade) || 0), 0);

  // ── Toggle de seleção ─────────────────────────────────────────────────────
  const toggleItem = (arr, setArr, nome) =>
    setArr(prev => prev.includes(nome) ? prev.filter(x => x !== nome) : [...prev, nome]);

  // ── Validações ────────────────────────────────────────────────────────────
  const validarStep1 = () => {
    if (!nome.trim())  { setError('Informe seu nome.'); return false; }
    if (!email.trim() || !email.includes('@')) { setError('Informe um e-mail válido.'); return false; }
    setError(null);
    return true;
  };

  const validarStep2 = () => {
    if (totalPratos < MIN_PRATOS) {
      setError(`O pedido mínimo é de ${MIN_PRATOS} marmitas.`);
      return false;
    }
    if (proteinas.some(p => !p.alimentoNome)) {
      setError('Selecione a proteína em todas as linhas.');
      return false;
    }
    if (proteinas.some(p => parseInt(p.quantidade) < MIN_QTD_POR_PROTEINA)) {
      setError(`Cada proteína deve ter no mínimo ${MIN_QTD_POR_PROTEINA} pratos iguais.`);
      return false;
    }
    if (somaProteinas !== totalPratos) {
      setError(`A soma das quantidades de proteína (${somaProteinas}) deve ser igual ao total de pratos (${totalPratos}).`);
      return false;
    }
    setError(null);
    return true;
  };

  const handleNext = () => {
    if (step === 1 && validarStep1()) setStep(2);
    if (step === 2 && validarStep2()) setStep(3);
  };

  const handleEnviar = async () => {
    setEnviando(true);
    setError(null);
    try {
      const payload = {
        nome, email, telefone,
        totalPratos,
        proteinas,
        carboidrato: carbAtivo ? { gramagem: carbGramagem, alimentoNomes: carbSelecionados } : null,
        leguminosa:  legumAtivo ? { gramagem: legumGramagem, alimentoNomes: legumSelecionados } : null,
        legume:      legumeAtivo ? { gramagem: legumeGramagem, alimentoNomes: legumeSelecionados, obs: legumeObs } : null,
        molhos:      molhosSelecionados.length > 0 ? molhosSelecionados : null,
        observacoes,
      };
      await portalPublicApi.solicitar(payload);
      setStep(4);
    } catch (err) {
      setError(err.response?.data?.error || 'Erro ao enviar. Tente novamente.');
    } finally {
      setEnviando(false);
    }
  };

  // ── Desconto por quantidade ───────────────────────────────────────────────
  const getDescontoInfo = (total) => {
    if (total >= 30) return { label: 'Melhor condição', color: '#166534', bg: '#f0fdf4', border: '#bbf7d0' };
    if (total >= 20) return { label: 'Ótima condição', color: '#1e40af', bg: '#eff6ff', border: '#bfdbfe' };
    if (total >= 14) return { label: 'Boa condição', color: '#854d0e', bg: '#fefce8', border: '#fde68a' };
    return null;
  };
  const descontoInfo = getDescontoInfo(totalPratos);

  if (loading) return (
    <div style={{ minHeight: '100vh', background: '#fff5f5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ textAlign: 'center', color: '#7B1A1A' }}>Carregando...</div>
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #7B1A1A 0%, #3D0B0B 100%)', padding: '20px 16px' }}>
      {/* Header */}
      <div style={{ maxWidth: 660, margin: '0 auto 16px' }}>
        <div style={{ textAlign: 'center', color: '#fff' }}>
          <div style={{ fontSize: '1.6rem', fontWeight: 900, letterSpacing: 2 }}>MEAL TIME</div>
          <div style={{ fontSize: '0.75rem', letterSpacing: 4, opacity: 0.7, marginBottom: 8 }}>ULTRACONGELADOS</div>
          <div style={{ fontSize: '1rem', opacity: 0.9 }}>Solicitação de Orçamento de Dieta</div>
        </div>
      </div>

      {/* Aviso geral — pesagem */}
      <div style={{ maxWidth: 660, margin: '0 auto 16px', background: 'rgba(255,255,255,0.12)', borderRadius: 10, padding: '10px 16px', color: 'rgba(255,255,255,0.9)', fontSize: '0.8rem', lineHeight: 1.5, border: '1px solid rgba(255,255,255,0.2)' }}>
        ⚖️ <b>Todos os alimentos são pesados prontos</b> e aferidos com balanças com selo do INMETRO. Ao descongelar, pode ocorrer pequena perda de peso por desidratação, mas <b>sem comprometer os nutrientes</b>.
      </div>

      {/* Steps indicator */}
      <div style={{ maxWidth: 660, margin: '0 auto 20px', display: 'flex', gap: 8 }}>
        {[1, 2, 3].map(s => (
          <div key={s} style={{
            flex: 1, height: 4, borderRadius: 2,
            background: step >= s ? '#fff' : 'rgba(255,255,255,0.2)',
            transition: 'background 0.3s',
          }} />
        ))}
      </div>

      {/* Card principal */}
      <div style={{ maxWidth: 660, margin: '0 auto', background: '#fff', borderRadius: 16, overflow: 'hidden', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>

        {error && (
          <div style={{ background: '#fee2e2', color: '#991b1b', padding: '10px 20px', fontSize: '0.875rem', borderBottom: '1px solid #fca5a5' }}>
            {error}
          </div>
        )}

        {/* ── STEP 1 — Dados pessoais ─────────────────────────────────────── */}
        {step === 1 && (
          <div style={{ padding: 28 }}>
            <h2 style={{ margin: '0 0 4px', color: '#7B1A1A', fontSize: '1.2rem' }}>Seus dados</h2>
            <p style={{ margin: '0 0 20px', color: '#64748b', fontSize: '0.875rem' }}>Vamos precisar de algumas informações para entrar em contato.</p>

            <label style={labelStyle}>Nome completo *</label>
            <input style={inputStyle} value={nome} onChange={e => setNome(e.target.value)} placeholder="Seu nome" />

            <label style={labelStyle}>E-mail *</label>
            <input style={inputStyle} type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="seu@email.com" />

            <label style={labelStyle}>Telefone / WhatsApp</label>
            <input style={inputStyle} value={telefone} onChange={e => setTelefone(e.target.value)} placeholder="(00) 00000-0000" />

            <label style={labelStyle}>Observações gerais (alergias, restrições...)</label>
            <textarea style={{ ...inputStyle, height: 80, resize: 'vertical' }} value={observacoes} onChange={e => setObservacoes(e.target.value)} placeholder="Ex: alérgico a lactose, não como carne de porco..." />

            <button style={btnPrimaryStyle} onClick={handleNext}>Próximo →</button>
          </div>
        )}

        {/* ── STEP 2 — Preferências alimentares ──────────────────────────── */}
        {step === 2 && (
          <div style={{ padding: 28 }}>
            <h2 style={{ margin: '0 0 4px', color: '#7B1A1A', fontSize: '1.2rem' }}>Preferências alimentares</h2>
            <p style={{ margin: '0 0 20px', color: '#64748b', fontSize: '0.875rem' }}>Configure a distribuição das suas marmitas.</p>

            {/* Total de pratos */}
            <div style={sectionStyle}>
              <label style={{ ...labelStyle, marginBottom: 4 }}>Total de marmitas <span style={{ color: '#64748b', fontWeight: 400 }}>(mínimo {MIN_PRATOS})</span></label>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: descontoInfo ? 10 : 0 }}>
                <button style={btnCounterStyle} onClick={() => setTotalPratos(t => Math.max(MIN_PRATOS, t - 1))}>−</button>
                <span style={{ fontSize: '1.4rem', fontWeight: 700, color: '#7B1A1A', minWidth: 40, textAlign: 'center' }}>{totalPratos}</span>
                <button style={btnCounterStyle} onClick={() => setTotalPratos(t => t + 1)}>+</button>
              </div>

              {/* Badge de condição por quantidade */}
              {descontoInfo && (
                <div style={{ display: 'inline-block', background: descontoInfo.bg, border: `1px solid ${descontoInfo.border}`, borderRadius: 6, padding: '4px 10px', fontSize: '0.78rem', fontWeight: 700, color: descontoInfo.color }}>
                  🎉 {descontoInfo.label} — quanto mais marmitas, melhor o desconto e os prazos!
                </div>
              )}

              {/* Dica de desconto */}
              <div style={{ marginTop: 10, fontSize: '0.78rem', color: '#64748b', lineHeight: 1.5 }}>
                💡 <b>Tabela de condições:</b> 7–13 marmitas · 14–19 = boa condição · 20–29 = ótima condição · 30+ = melhor condição e desconto especial
              </div>
            </div>

            {/* Proteínas */}
            <div style={sectionStyle}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <label style={{ ...labelStyle, marginBottom: 0, color: '#7B1A1A', fontWeight: 700 }}>Proteínas *</label>
                <span style={{ fontSize: '0.8rem', color: somaProteinas === totalPratos ? '#166534' : '#991b1b', fontWeight: 600 }}>
                  {somaProteinas}/{totalPratos} pratos
                </span>
              </div>

              <div style={{ background: '#fef9ec', border: '1px solid #fde68a', borderRadius: 6, padding: '6px 10px', marginBottom: 10, fontSize: '0.78rem', color: '#92400e' }}>
                Mínimo de <b>{MIN_QTD_POR_PROTEINA} pratos iguais</b> por proteína. Ex: 5× Frango + 5× Salmão = 10 marmitas.
              </div>

              {proteinas.map((p, idx) => (
                <div key={idx} style={{ display: 'flex', gap: 8, marginBottom: 8, flexWrap: 'wrap', alignItems: 'flex-end' }}>
                  <div style={{ flex: '1 1 160px' }}>
                    <div style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: 3 }}>Alimento</div>
                    <select style={selectStyle} value={p.alimentoNome} onChange={e => updateProteina(idx, 'alimentoNome', e.target.value)}>
                      <option value="">Selecione...</option>
                      {(grpProteina?.alimentos || []).map(a => (
                        <option key={a.id} value={a.nome}>{a.nome}</option>
                      ))}
                    </select>
                  </div>
                  <div style={{ flex: '0 0 90px' }}>
                    <div style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: 3 }}>Gramagem</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <input style={{ ...inputStyle, margin: 0, width: '70px' }} type="number" min="50" max="500" value={p.gramagem} onChange={e => updateProteina(idx, 'gramagem', e.target.value)} />
                      <span style={{ fontSize: '0.8rem', color: '#64748b' }}>g</span>
                    </div>
                  </div>
                  <div style={{ flex: '0 0 100px' }}>
                    <div style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: 3 }}>Qtd. pratos</div>
                    <input style={{ ...inputStyle, margin: 0 }} type="number" min={MIN_QTD_POR_PROTEINA} max={totalPratos} value={p.quantidade} onChange={e => updateProteina(idx, 'quantidade', e.target.value)} />
                  </div>
                  {proteinas.length > 1 && (
                    <button style={{ ...btnDangerSmall, alignSelf: 'flex-end', marginBottom: 2 }} onClick={() => removeProteina(idx)}>✕</button>
                  )}
                </div>
              ))}
              <button style={btnGhostStyle} onClick={addProteina}>+ Adicionar proteína</button>
            </div>

            {/* Carboidrato */}
            <div style={sectionStyle}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                <input type="checkbox" id="carb" checked={carbAtivo} onChange={e => setCarbAtivo(e.target.checked)} style={{ width: 16, height: 16, accentColor: '#7B1A1A' }} />
                <label htmlFor="carb" style={{ fontWeight: 700, color: '#7B1A1A', cursor: 'pointer', fontSize: '0.95rem' }}>Carboidrato</label>
              </div>
              {carbAtivo && (
                <>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                    <label style={{ fontSize: '0.8rem', color: '#64748b' }}>Gramagem:</label>
                    <input style={{ ...inputStyle, margin: 0, width: 70 }} type="number" value={carbGramagem} onChange={e => setCarbGramagem(e.target.value)} />
                    <span style={{ fontSize: '0.8rem', color: '#64748b' }}>g</span>
                  </div>
                  <div style={{ background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: 6, padding: '6px 10px', marginBottom: 10, fontSize: '0.78rem', color: '#0369a1' }}>
                    ℹ️ A gramagem informada considera o <b>arroz como padrão</b>. Os demais alimentos são calculados de acordo com a <b>Tabela TACO</b> para equivalência nutricional.
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {(grpCarb?.alimentos || []).map(a => (
                      <button key={a.id} style={chipStyle(carbSelecionados.includes(a.nome))} onClick={() => toggleItem(carbSelecionados, setCarbSelecionados, a.nome)}>
                        {a.nome}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* Leguminosa */}
            <div style={sectionStyle}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                <input type="checkbox" id="legum" checked={legumAtivo} onChange={e => setLegumAtivo(e.target.checked)} style={{ width: 16, height: 16, accentColor: '#7B1A1A' }} />
                <label htmlFor="legum" style={{ fontWeight: 700, color: '#7B1A1A', cursor: 'pointer', fontSize: '0.95rem' }}>Leguminosa</label>
              </div>
              {legumAtivo && (
                <>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                    <label style={{ fontSize: '0.8rem', color: '#64748b' }}>Gramagem:</label>
                    <input style={{ ...inputStyle, margin: 0, width: 70 }} type="number" value={legumGramagem} onChange={e => setLegumGramagem(e.target.value)} />
                    <span style={{ fontSize: '0.8rem', color: '#64748b' }}>g</span>
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {(grpLeguminosa?.alimentos || []).map(a => (
                      <button key={a.id} style={chipStyle(legumSelecionados.includes(a.nome))} onClick={() => toggleItem(legumSelecionados, setLegumSelecionados, a.nome)}>
                        {a.nome}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* Legume */}
            <div style={sectionStyle}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                <input type="checkbox" id="legume" checked={legumeAtivo} onChange={e => setLegumeAtivo(e.target.checked)} style={{ width: 16, height: 16, accentColor: '#7B1A1A' }} />
                <label htmlFor="legume" style={{ fontWeight: 700, color: '#7B1A1A', cursor: 'pointer', fontSize: '0.95rem' }}>Legumes</label>
              </div>
              {legumeAtivo && (
                <>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                    <label style={{ fontSize: '0.8rem', color: '#64748b' }}>Gramagem:</label>
                    <input style={{ ...inputStyle, margin: 0, width: 70 }} type="number" value={legumeGramagem} onChange={e => setLegumeGramagem(e.target.value)} />
                    <span style={{ fontSize: '0.8rem', color: '#64748b' }}>g</span>
                  </div>
                  <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 6, padding: '6px 10px', marginBottom: 10, fontSize: '0.78rem', color: '#166534' }}>
                    🥦 Você pode escolher <b>1 legume específico</b> ou selecionar <b>MIX</b> — sortido com 2 a 3 legumes por prato. <b>Informe quais não gosta</b> para não serem incluídos, ou especifique sua lista preferida no campo de observações abaixo.
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
                    {(grpLegume?.alimentos || []).map(a => (
                      <button key={a.id} style={chipStyle(legumeSelecionados.includes(a.nome))} onClick={() => toggleItem(legumeSelecionados, setLegumeSelecionados, a.nome)}>
                        {a.nome}
                      </button>
                    ))}
                  </div>
                  <textarea style={{ ...inputStyle, height: 60, resize: 'vertical' }} placeholder="Alguma observação sobre os legumes? (ex: não gosto de cebola)" value={legumeObs} onChange={e => setLegumeObs(e.target.value)} />
                </>
              )}
            </div>

            {/* Molhos */}
            {grpMolho && (
              <div style={sectionStyle}>
                <label style={{ ...labelStyle, color: '#7B1A1A', fontWeight: 700 }}>Molhos (opcional)</label>
                <p style={{ fontSize: '0.8rem', color: '#64748b', margin: '0 0 8px' }}>Selecione os molhos que deseja nas suas marmitas</p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {(grpMolho?.alimentos || []).map(a => (
                    <button key={a.id} style={chipStyle(molhosSelecionados.includes(a.nome))} onClick={() => toggleItem(molhosSelecionados, setMolhosSelecionados, a.nome)}>
                      {a.nome}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div style={{ display: 'flex', gap: 10 }}>
              <button style={btnSecondaryStyle} onClick={() => setStep(1)}>← Voltar</button>
              <button style={{ ...btnPrimaryStyle, flex: 1 }} onClick={handleNext}>Revisar pedido →</button>
            </div>
          </div>
        )}

        {/* ── STEP 3 — Revisão ────────────────────────────────────────────── */}
        {step === 3 && (
          <div style={{ padding: 28 }}>
            <h2 style={{ margin: '0 0 4px', color: '#7B1A1A', fontSize: '1.2rem' }}>Revise sua solicitação</h2>
            <p style={{ margin: '0 0 20px', color: '#64748b', fontSize: '0.875rem' }}>Confira os detalhes antes de enviar para orçamento.</p>

            <div style={reviewSectionStyle}>
              <div style={reviewTitleStyle}>Seus dados</div>
              <div style={reviewRowStyle}><b>Nome:</b> {nome}</div>
              <div style={reviewRowStyle}><b>E-mail:</b> {email}</div>
              {telefone && <div style={reviewRowStyle}><b>Telefone:</b> {telefone}</div>}
              {observacoes && <div style={reviewRowStyle}><b>Obs:</b> {observacoes}</div>}
            </div>

            <div style={reviewSectionStyle}>
              <div style={reviewTitleStyle}>Distribuição — {totalPratos} marmitas</div>
              {proteinas.map((p, i) => (
                <div key={i} style={reviewRowStyle}>
                  <b>{p.alimentoNome}</b> — {p.gramagem}g × {p.quantidade} pratos
                </div>
              ))}
              {carbAtivo && (
                <div style={reviewRowStyle}>
                  <b>Carboidrato</b> — {carbGramagem}g
                  {carbSelecionados.length > 0 && ` (${carbSelecionados.join(', ')})`}
                </div>
              )}
              {legumAtivo && (
                <div style={reviewRowStyle}>
                  <b>Leguminosa</b> — {legumGramagem}g
                  {legumSelecionados.length > 0 && ` (${legumSelecionados.join(', ')})`}
                </div>
              )}
              {legumeAtivo && (
                <div style={reviewRowStyle}>
                  <b>Legumes</b> — {legumeGramagem}g
                  {legumeSelecionados.length > 0 && ` (${legumeSelecionados.join(', ')})`}
                  {legumeObs && ` — ${legumeObs}`}
                </div>
              )}
              {molhosSelecionados.length > 0 && (
                <div style={reviewRowStyle}><b>Molhos:</b> {molhosSelecionados.join(', ')}</div>
              )}
            </div>

            <div style={{ background: '#fef3c7', border: '1px solid #fde68a', borderRadius: 8, padding: '10px 14px', marginBottom: 20, fontSize: '0.85rem', color: '#92400e' }}>
              Após o envio, nossa equipe entrará em contato pelo <b>WhatsApp</b> com o orçamento e os prazos de preparo.
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <button style={btnSecondaryStyle} onClick={() => setStep(2)}>← Editar</button>
              <button style={{ ...btnPrimaryStyle, flex: 1 }} onClick={handleEnviar} disabled={enviando}>
                {enviando ? 'Enviando...' : 'Enviar para Orçamento'}
              </button>
            </div>
          </div>
        )}

        {/* ── STEP 4 — Sucesso ────────────────────────────────────────────── */}
        {step === 4 && (
          <div style={{ padding: 40, textAlign: 'center' }}>
            <div style={{ fontSize: '3rem', marginBottom: 12 }}>✅</div>
            <h2 style={{ color: '#166534', margin: '0 0 8px' }}>Solicitação enviada!</h2>
            <p style={{ color: '#64748b', marginBottom: 20 }}>
              Recebemos sua solicitação, <b>{nome}</b>!<br />
              Nossa equipe entrará em contato pelo <b>WhatsApp</b> com o orçamento personalizado e os prazos de preparo.
            </p>
            <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 10, padding: '12px 20px', display: 'inline-block', marginBottom: 24 }}>
              <div style={{ fontSize: '0.85rem', color: '#166534' }}>
                <b>{totalPratos} marmitas</b> · {proteinas.map(p => p.alimentoNome).join(', ')}
              </div>
            </div>
            <div>
              <button style={btnSecondaryStyle} onClick={() => {
                setStep(1);
                setNome(''); setEmail(''); setTelefone(''); setObservacoes('');
                setProteinas([{ alimentoNome: '', gramagem: 150, quantidade: MIN_PRATOS }]);
                setCarbAtivo(false); setLegumAtivo(false); setLegumeAtivo(false);
                setMolhosSelecionados([]);
              }}>
                Nova solicitação
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div style={{ maxWidth: 660, margin: '20px auto 0', textAlign: 'center', color: 'rgba(255,255,255,0.4)', fontSize: '0.75rem' }}>
        Meal Time Ultracongelados © 2026
      </div>
    </div>
  );
}

// ── Estilos inline ──────────────────────────────────────────────────────────
const labelStyle = {
  display: 'block', fontSize: '0.8rem', fontWeight: 600,
  color: '#374151', marginBottom: 4, marginTop: 12,
};
const inputStyle = {
  display: 'block', width: '100%', padding: '9px 12px',
  border: '1.5px solid #e2e8f0', borderRadius: 8,
  fontSize: '0.95rem', color: '#1e293b', background: '#fff',
  boxSizing: 'border-box', marginBottom: 4,
  outline: 'none',
};
const selectStyle = {
  ...inputStyle, cursor: 'pointer', background: '#fff',
};
const btnPrimaryStyle = {
  width: '100%', padding: '11px 20px', background: '#7B1A1A',
  color: '#fff', border: 'none', borderRadius: 8, fontSize: '0.95rem',
  fontWeight: 700, cursor: 'pointer', marginTop: 16,
};
const btnSecondaryStyle = {
  padding: '11px 20px', background: '#f1f5f9', color: '#374151',
  border: '1px solid #e2e8f0', borderRadius: 8, fontSize: '0.9rem',
  fontWeight: 600, cursor: 'pointer', marginTop: 16,
};
const btnGhostStyle = {
  padding: '6px 14px', background: 'transparent', color: '#7B1A1A',
  border: '1.5px dashed #7B1A1A', borderRadius: 8, fontSize: '0.82rem',
  fontWeight: 600, cursor: 'pointer',
};
const btnCounterStyle = {
  width: 36, height: 36, background: '#7B1A1A', color: '#fff',
  border: 'none', borderRadius: 8, fontSize: '1.2rem', cursor: 'pointer',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
};
const btnDangerSmall = {
  padding: '6px 10px', background: '#fee2e2', color: '#991b1b',
  border: 'none', borderRadius: 6, fontSize: '0.8rem', cursor: 'pointer',
};
const sectionStyle = {
  border: '1px solid #e2e8f0', borderRadius: 10,
  padding: '14px 16px', marginBottom: 12,
};
const chipStyle = (active) => ({
  padding: '5px 12px', borderRadius: 20, fontSize: '0.82rem',
  fontWeight: active ? 700 : 400, cursor: 'pointer',
  background: active ? '#7B1A1A' : '#f1f5f9',
  color: active ? '#fff' : '#374151',
  border: `1.5px solid ${active ? '#7B1A1A' : '#e2e8f0'}`,
  transition: 'all 0.15s',
});
const reviewSectionStyle = {
  background: '#f8fafc', border: '1px solid #e2e8f0',
  borderRadius: 10, padding: '12px 16px', marginBottom: 12,
};
const reviewTitleStyle = {
  fontWeight: 700, color: '#7B1A1A', fontSize: '0.85rem',
  marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5,
};
const reviewRowStyle = {
  fontSize: '0.88rem', color: '#374151', padding: '3px 0',
};
