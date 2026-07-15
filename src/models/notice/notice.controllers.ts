import { Request, Response } from "express";
import Notice from "./notice.model";
import { cache } from "../../utils/cache";
import { revalidateFrontend } from "../../utils/revalidate";

/**
 * @desc Create a new notice (Admin only)
 * @route POST /api/notice
 * @access Private (Admin)
 */
export const createNotice = async (req: Request, res: Response): Promise<void> => {
  try {
    const { title, description, keyPoints, button, isActive, priority } = req.body;

    if (!title || !description) {
      res.status(400).json({
        success: false,
        message: "Title and description are required",
      });
      return;
    }

    // Validate button color format if provided
    if (button?.color && !/^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/.test(button.color)) {
      res.status(400).json({
        success: false,
        message: "Invalid button color format. Use hex color (e.g., #1976d2)",
      });
      return;
    }

    // Validate button URL format if provided
    if (button?.url && !/^https?:\/\/.+/.test(button.url)) {
      res.status(400).json({
        success: false,
        message: "Invalid button URL format. Must start with http:// or https://",
      });
      return;
    }

    const notice = await Notice.create({
      title,
      description,
      keyPoints: Array.isArray(keyPoints) ? keyPoints : [],
      button: {
        text: button?.text || null,
        color: button?.color || "#1976d2",
        url: button?.url || null,
      },
      isActive: isActive !== undefined ? isActive : true,
      priority: priority || 0,
    });

    await cache.del("notices:active");
    await cache.delByPrefix("homepage");
    await revalidateFrontend();

    res.status(201).json({
      success: true,
      message: "Notice created successfully",
      data: notice,
    });
  } catch (error: any) {
    console.error("Create Notice Error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Internal Server Error",
    });
  }
};

/**
 * @desc Get all notices (Admin - includes inactive)
 * @route GET /api/notice/admin/all
 * @access Private (Admin)
 */
export const getAllNoticesAdmin = async (req: Request, res: Response): Promise<void> => {
  try {
    const notices = await Notice.find()
      .sort({ priority: -1, createdAt: -1 })
      .lean();

    res.status(200).json({
      success: true,
      data: notices,
    });
  } catch (error: any) {
    console.error("Get All Notices Error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Internal Server Error",
    });
  }
};

/**
 * @desc Get active notices (Public - for dropshipping user overview)
 * @route GET /api/notice/active
 * @access Public
 */
export const getActiveNotices = async (req: Request, res: Response): Promise<void> => {
  try {
    const cacheKey = "notices:active";
    const cached = await cache.get(cacheKey);
    if (cached) {
      res.set("Cache-Control", "public, max-age=300, stale-while-revalidate=60");
      res.status(200).json(cached);
      return;
    }

    const notices = await Notice.find({ isActive: true })
      .sort({ priority: -1, createdAt: -1 })
      .lean();

    const response = { success: true, data: notices };
    await cache.set(cacheKey, response, 300);
    res.set("Cache-Control", "public, max-age=300, stale-while-revalidate=60");
    res.status(200).json(response);
  } catch (error: any) {
    console.error("Get Active Notices Error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Internal Server Error",
    });
  }
};

/**
 * @desc Get single notice by ID
 * @route GET /api/notice/:id
 * @access Private (Admin)
 */
export const getNoticeById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const notice = await Notice.findById(id).lean();

    if (!notice) {
      res.status(404).json({
        success: false,
        message: "Notice not found",
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: notice,
    });
  } catch (error: any) {
    console.error("Get Notice Error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Internal Server Error",
    });
  }
};

/**
 * @desc Update a notice (Admin only)
 * @route PUT /api/notice/:id
 * @access Private (Admin)
 */
export const updateNotice = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { title, description, keyPoints, button, isActive, priority } = req.body;

    const notice = await Notice.findById(id);

    if (!notice) {
      res.status(404).json({
        success: false,
        message: "Notice not found",
      });
      return;
    }

    // Validate button color format if provided
    if (button?.color && !/^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/.test(button.color)) {
      res.status(400).json({
        success: false,
        message: "Invalid button color format. Use hex color (e.g., #1976d2)",
      });
      return;
    }

    // Validate button URL format if provided
    if (button?.url && !/^https?:\/\/.+/.test(button.url)) {
      res.status(400).json({
        success: false,
        message: "Invalid button URL format. Must start with http:// or https://",
      });
      return;
    }

    // Update fields
    if (title !== undefined) notice.title = title;
    if (description !== undefined) notice.description = description;
    if (keyPoints !== undefined) notice.keyPoints = Array.isArray(keyPoints) ? keyPoints : [];
    if (button !== undefined) {
      notice.button = {
        text: button.text !== undefined ? button.text : notice.button?.text,
        color: button.color !== undefined ? button.color : notice.button?.color || "#1976d2",
        url: button.url !== undefined ? button.url : notice.button?.url,
      };
    }
    if (isActive !== undefined) notice.isActive = isActive;
    if (priority !== undefined) notice.priority = priority;

    await notice.save();

    await cache.del("notices:active");
    await cache.delByPrefix("homepage");

    res.status(201).json({
      success: true,
      message: "Notice created successfully",
      data: notice,
    });
  } catch (error: any) {
    console.error("Update Notice Error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Internal Server Error",
    });
  }
};

/**
 * @desc Delete a notice (Admin only)
 * @route DELETE /api/notice/:id
 * @access Private (Admin)
 */
export const deleteNotice = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const notice = await Notice.findByIdAndDelete(id);

    if (!notice) {
      res.status(404).json({
        success: false,
        message: "Notice not found",
      });
      return;
    }

    await cache.del("notices:active");
    await cache.delByPrefix("homepage");

    res.status(200).json({
      success: true,
      message: "Notice deleted successfully",
    });
  } catch (error: any) {
    console.error("Delete Notice Error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Internal Server Error",
    });
  }
};

/**
 * @desc Toggle notice active status (Admin only)
 * @route PATCH /api/notice/:id/toggle
 * @access Private (Admin)
 */
export const toggleNoticeStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const notice = await Notice.findById(id);

    if (!notice) {
      res.status(404).json({
        success: false,
        message: "Notice not found",
      });
      return;
    }

    notice.isActive = !notice.isActive;
    await notice.save();

    await cache.del("notices:active");
    await cache.delByPrefix("homepage");

    res.status(200).json({
      success: true,
      message: "Notice updated successfully",
      data: notice,
    });
  } catch (error: any) {
    console.error("Toggle Notice Error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Internal Server Error",
    });
  }
};
