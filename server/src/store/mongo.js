// MongoDB store (via Mongoose). Each scoring run is one document that holds the
// ICP used, the summary, and the scored leads. Fine for demo-sized files; for very
// large lists you would store leads in their own collection.

export async function createMongoStore(uri) {
  const { default: mongoose } = await import('mongoose');
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 8000 });

  const Run = mongoose.model(
    'Run',
    new mongoose.Schema(
      {
        icp: mongoose.Schema.Types.Mixed,
        summary: mongoose.Schema.Types.Mixed,
        leads: mongoose.Schema.Types.Mixed,
      },
      { timestamps: true },
    ),
  );

  const shape = (doc) => {
    if (!doc) return null;
    const { _id, __v, createdAt, updatedAt, ...rest } = doc;
    return { id: String(_id), createdAt, ...rest };
  };

  return {
    kind: 'mongodb',
    async saveRun(run) {
      const doc = await Run.create(run);
      return { id: String(doc._id) };
    },
    async getRun(id) {
      if (!mongoose.isValidObjectId(id)) return null;
      return shape(await Run.findById(id).lean());
    },
    async listRuns(limit = 20) {
      const docs = await Run.find().sort({ createdAt: -1 }).limit(limit).select('createdAt summary icp').lean();
      return docs.map(shape);
    },
  };
}
